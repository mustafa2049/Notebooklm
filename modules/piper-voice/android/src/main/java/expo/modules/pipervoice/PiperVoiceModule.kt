package expo.modules.pipervoice

import android.media.AudioAttributes
import android.media.AudioFormat
import android.media.AudioTrack
import expo.modules.kotlin.Promise
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.Executors
import java.util.concurrent.atomic.AtomicInteger

/**
 * Kendi sesin — Android motoru (bkz. `src/voice/backend.android.ts`).
 *
 * JS fonem kimliklerini verir; burada model çalışır ve ses AudioTrack ile
 * çalınır. Üretilen parçalar kimlikle bellekte tutulur (JS'e örnek
 * aktarılmaz); JS onları sırayla çaldırır ve işi bitenleri bırakır.
 *
 * - Model üretimi tek bir arka plan iş parçacığında, sırayla.
 * - Aynı anda birden çok ses açık olabilir (içe aktarırken deneme), kimlikle.
 * - Çalma tektir: yeni çalma ya da `stop` öncekini keser; kesilen çalma
 *   `false` ile biter.
 */
class PiperVoiceModule : Module() {
  private val worker = Executors.newSingleThreadExecutor()
  private val voices = ConcurrentHashMap<String, PiperSynth>()
  private val rates = ConcurrentHashMap<String, Int>()
  private val clips = ConcurrentHashMap<Int, Clip>()
  private val nextClip = AtomicInteger(1)
  private val lock = Any()
  @Volatile private var playback: Any? = null
  private var track: AudioTrack? = null

  private class Clip(val samples: FloatArray, val sampleRate: Int)

  override fun definition() = ModuleDefinition {
    Name("PiperVoice")

    AsyncFunction("load") { key: String, path: String, sampleRate: Int, promise: Promise ->
      worker.execute {
        try {
          voices.remove(key)?.close()
          val threads = Runtime.getRuntime().availableProcessors().coerceIn(1, 4)
          voices[key] = PiperSynth(path, threads)
          rates[key] = sampleRate
          promise.resolve(null)
        } catch (error: Throwable) {
          promise.reject("ERR_PIPER_LOAD", error.message ?: "Ses modeli açılamadı", error)
        }
      }
    }

    AsyncFunction("synthesize") { key: String, ids: IntArray, noise: Double, length: Double, noiseW: Double, promise: Promise ->
      worker.execute {
        try {
          val synth = voices[key] ?: throw IllegalStateException("Ses yüklenmedi")
          val samples = synth.synthesize(LongArray(ids.size) { ids[it].toLong() }, noise.toFloat(), length.toFloat(), noiseW.toFloat())
          val rate = rates[key] ?: 22050
          val id = nextClip.getAndIncrement()
          clips[id] = Clip(samples, rate)
          promise.resolve(mapOf("id" to id, "durationMs" to samples.size * 1000.0 / rate))
        } catch (error: Throwable) {
          promise.reject("ERR_PIPER_SYNTH", error.message ?: "Ses üretilemedi", error)
        }
      }
    }

    AsyncFunction("play") { id: Int, promise: Promise ->
      val clip = clips[id]
      if (clip == null) {
        promise.reject("ERR_PIPER_PLAY", "Ses parçası bulunamadı", null)
      } else {
        play(clip, promise)
      }
    }

    Function("stop") { stopPlayback() }

    Function("release") { id: Int ->
      clips.remove(id)
      Unit
    }

    AsyncFunction("unload") { key: String, promise: Promise ->
      worker.execute {
        voices.remove(key)?.close()
        rates.remove(key)
        promise.resolve(null)
      }
    }

    OnDestroy {
      stopPlayback()
      worker.execute {
        voices.values.forEach { it.close() }
        voices.clear()
        clips.clear()
      }
      worker.shutdown()
    }
  }

  private fun play(clip: Clip, promise: Promise) {
    stopPlayback()
    val token = Any()
    synchronized(lock) { playback = token }
    Thread {
      var audio: AudioTrack? = null
      try {
        val format =
          AudioFormat.Builder()
            .setEncoding(AudioFormat.ENCODING_PCM_FLOAT)
            .setSampleRate(clip.sampleRate)
            .setChannelMask(AudioFormat.CHANNEL_OUT_MONO)
            .build()
        val attributes =
          AudioAttributes.Builder()
            .setUsage(AudioAttributes.USAGE_MEDIA)
            .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH)
            .build()
        val minimum = AudioTrack.getMinBufferSize(clip.sampleRate, AudioFormat.CHANNEL_OUT_MONO, AudioFormat.ENCODING_PCM_FLOAT)
        val created =
          AudioTrack.Builder()
            .setAudioAttributes(attributes)
            .setAudioFormat(format)
            .setBufferSizeInBytes(maxOf(minimum, clip.sampleRate * 2))
            .setTransferMode(AudioTrack.MODE_STREAM)
            .build()
        audio = created
        synchronized(lock) {
          if (playback !== token) {
            promise.resolve(false)
            return@Thread
          }
          track = created
        }
        created.play()
        val samples = clip.samples
        var offset = 0
        // Engellemeyen yazma: durdurulunca döngü hemen biter
        while (offset < samples.size && playback === token) {
          val written = created.write(samples, offset, samples.size - offset, AudioTrack.WRITE_NON_BLOCKING)
          if (written < 0) throw IllegalStateException("AudioTrack yazma hatası $written")
          offset += written
          if (written == 0) Thread.sleep(5)
        }
        // Tampondaki ses bitene kadar
        while (playback === token && created.playbackHeadPosition < samples.size) Thread.sleep(10)
        promise.resolve(playback === token)
      } catch (error: Throwable) {
        promise.reject("ERR_PIPER_PLAY", error.message ?: "Ses çalınamadı", error)
      } finally {
        synchronized(lock) {
          if (track === audio) track = null
          if (playback === token) playback = null
        }
        audio?.let {
          try {
            it.stop()
          } catch (_: Throwable) {
          }
          it.release()
        }
      }
    }.start()
  }

  private fun stopPlayback() {
    synchronized(lock) {
      playback = null
      track?.let {
        try {
          it.pause()
          it.flush()
        } catch (_: Throwable) {
        }
      }
    }
  }
}

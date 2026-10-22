package expo.modules.pipervoice

import ai.onnxruntime.OnnxTensor
import ai.onnxruntime.OrtEnvironment
import ai.onnxruntime.OrtSession
import java.nio.FloatBuffer
import java.nio.LongBuffer

/**
 * Piper ses modeli: fonem kimliklerinden ses örnekleri (mono, float, -1…1).
 *
 * Android'e bağlı değil (yalnızca onnxruntime). Girdiler piper'ınkiyle aynı:
 * `input` [1, N] int64, `input_lengths` [1], `scales` [noise, length, noise_w],
 * çok konuşmacılı modelde `sid`. Çıktının şekli modele göre [1, 1, 1, T] ya da
 * [1, 1, T]; örnekler düz okunur.
 */
class PiperSynth(modelPath: String, threads: Int) : AutoCloseable {
  private val env: OrtEnvironment = OrtEnvironment.getEnvironment()
  private val session: OrtSession =
    env.createSession(
      modelPath,
      OrtSession.SessionOptions().apply {
        setIntraOpNumThreads(threads)
        setOptimizationLevel(OrtSession.SessionOptions.OptLevel.ALL_OPT)
      }
    )
  private val hasSpeaker = session.inputNames.contains("sid")

  fun synthesize(ids: LongArray, noise: Float, length: Float, noiseW: Float): FloatArray {
    val tensors = mutableListOf<OnnxTensor>()
    try {
      val feeds = mutableMapOf<String, OnnxTensor>()
      feeds["input"] = OnnxTensor.createTensor(env, LongBuffer.wrap(ids), longArrayOf(1, ids.size.toLong())).also(tensors::add)
      feeds["input_lengths"] =
        OnnxTensor.createTensor(env, LongBuffer.wrap(longArrayOf(ids.size.toLong())), longArrayOf(1)).also(tensors::add)
      feeds["scales"] =
        OnnxTensor.createTensor(env, FloatBuffer.wrap(floatArrayOf(noise, length, noiseW)), longArrayOf(3)).also(tensors::add)
      if (hasSpeaker) {
        feeds["sid"] = OnnxTensor.createTensor(env, LongBuffer.wrap(longArrayOf(0)), longArrayOf(1)).also(tensors::add)
      }
      session.run(feeds).use { result ->
        val output = result.get(0) as OnnxTensor
        val buffer = output.floatBuffer
        return FloatArray(buffer.remaining()).also { buffer.get(it) }
      }
    } finally {
      tensors.forEach { it.close() }
    }
  }

  override fun close() {
    session.close()
  }
}

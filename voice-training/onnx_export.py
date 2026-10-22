"""`python -m piper.train.export_onnx`, eski (TorchScript) dışa aktarıcıyla.

Yeni torch sürümlerinde `torch.onnx.export` varsayılan olarak dynamo
kullanıyor (onnxscript ister, VITS'in değişken uzunluklu girdileriyle
sorun çıkarabilir). Piper modelleri hep eski yolla dışa aktarıldı; aynı
girdi/çıktı adları ve şekilleri için o yol zorlanır.

export.py çağırır; argümanlar piper.train.export_onnx ile aynı.
"""

import functools
import runpy
import sys

import torch

torch.onnx.export = functools.partial(torch.onnx.export, dynamo=False)
sys.argv[0] = "piper.train.export_onnx"
runpy.run_module("piper.train.export_onnx", run_name="__main__")

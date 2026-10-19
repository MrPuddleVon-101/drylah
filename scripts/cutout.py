"""Background removal + face box using Apple Vision through PyObjC.
usage: python cutout.py <in> <out.png>   (prints face box JSON, origin bottom-left, normalised)"""
import sys, json
import Vision, Quartz
from Foundation import NSURL

src, dst = sys.argv[1], sys.argv[2]
ci = Quartz.CIImage.imageWithContentsOfURL_(NSURL.fileURLWithPath_(src))
handler = Vision.VNImageRequestHandler.alloc().initWithCIImage_options_(ci, None)
mask_req = Vision.VNGenerateForegroundInstanceMaskRequest.alloc().init()
face_req = Vision.VNDetectFaceRectanglesRequest.alloc().init()
ok, err = handler.performRequests_error_([mask_req, face_req], None)
assert ok, err
obs = mask_req.results()[0]
buf, err = obs.generateMaskedImageOfInstances_fromRequestHandler_croppedToInstancesExtent_error_(obs.allInstances(), handler, False, None)
assert buf is not None, err
out = Quartz.CIImage.imageWithCVPixelBuffer_(buf)
ctx = Quartz.CIContext.context()
cs = Quartz.CGColorSpaceCreateWithName(Quartz.kCGColorSpaceSRGB)
ok, err = ctx.writePNGRepresentationOfImage_toURL_format_colorSpace_options_error_(out, NSURL.fileURLWithPath_(dst), Quartz.kCIFormatRGBA8, cs, {}, None)
assert ok, err
faces = face_req.results() or []
if faces:
    b = faces[0].boundingBox()
    print(json.dumps({"x": b.origin.x, "y": b.origin.y, "w": b.size.width, "h": b.size.height}))

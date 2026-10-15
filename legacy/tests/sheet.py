import sys,glob
from PIL import Image
files=sorted(glob.glob(sys.argv[1]+'/*.png'));out=sys.argv[2];cols=int(sys.argv[3]) if len(sys.argv)>3 else 3;w=int(sys.argv[4]) if len(sys.argv)>4 else 600
ims=[Image.open(f) for f in files];h=int(ims[0].height*w/ims[0].width);rows=(len(ims)+cols-1)//cols
S=Image.new('RGB',(cols*w,rows*h))
for i,im in enumerate(ims):S.paste(im.convert('RGB').resize((w,h)),((i%cols)*w,(i//cols)*h))
S.save(out);print(files)

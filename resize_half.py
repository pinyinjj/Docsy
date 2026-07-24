from PIL import Image
import os

img_path = r'C:\Users\YJ\Documents\GitHub\Docsy\static\images\strategic_programming.png'
img = Image.open(img_path)
width = 375
ratio = (width / float(img.size[0]))
height = int((float(img.size[1]) * float(ratio)))
img = img.resize((width, height), Image.LANCZOS)
img.save(img_path)

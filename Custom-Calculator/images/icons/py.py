import cv2 as cv
import numpy as np

# generate icon 
source = np.ones((512, 512, 4))
source[:, :, 3] = 255
colors = [[130, 0, 75], [255, 0, 0], [0, 255, 0], [0, 0, 255]]
radius = 200

source[:256, :256, 0] = colors[0][0]
source[:256, :256, 1] = colors[0][1]
source[:256, :256, 2] = colors[0][2]

source[:256, 256:512, 0] = colors[1][0]
source[:256, 256:512, 1] = colors[1][1]
source[:256, 256:512, 2] = colors[1][2]

source[256:512, :256, 0] = colors[2][0]
source[256:512, :256, 1] = colors[2][1]
source[256:512, :256, 2] = colors[2][2]

source[256:512, 256:512, 0] = colors[3][0]
source[256:512, 256:512, 1] = colors[3][1]
source[256:512, 256:512, 2] = colors[3][2]

for r in range(radius-1):

	source[r, :radius-round((radius**2 - (radius-r)**2)**(1/2)), 3] = 0
	source[511-r, 511-(radius-round((radius**2 - (radius-r)**2)**(1/2))):, 3] = 0
	source[511-r, :radius-round((radius**2 - (radius-r)**2)**(1/2)), 3] = 0
	source[r, 511-(radius-round((radius**2 - (radius-r)**2)**(1/2))):, 3] = 0

cv.imwrite('icon-512x512.png', source)
cv.imwrite('icon-256x256.png', cv.resize(source, (256, 256)))
cv.imwrite('icon-144x144.png', cv.resize(source, (144, 144)))
cv.imwrite('icon-152x152.png', cv.resize(source, (152, 152)))
cv.imwrite('icon-96x96.png', cv.resize(source, (96, 96)))

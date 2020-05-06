import cv2 as cv
import numpy as np

# # generate icon 
# source = np.ones((512, 512, 4))
# source[:, :, 3] = 255
# colors = [[100, 200, 100], [100, 100, 100], [200, 200, 200], [100, 100, 200]]
# radius = 101

# source[:256, :256, 0] = colors[0][0]
# source[:256, :256, 1] = colors[0][1]
# source[:256, :256, 2] = colors[0][2]

# source[:256, 256:512, 0] = colors[1][0]
# source[:256, 256:512, 1] = colors[1][1]
# source[:256, 256:512, 2] = colors[1][2]

# source[256:512, :256, 0] = colors[2][0]
# source[256:512, :256, 1] = colors[2][1]
# source[256:512, :256, 2] = colors[2][2]

# source[256:512, 256:512, 0] = colors[3][0]
# source[256:512, 256:512, 1] = colors[3][1]
# source[256:512, 256:512, 2] = colors[3][2]

# for r in range(radius-1):

# 	source[r, :radius-round((radius**2 - (radius-r)**2)**(1/2)), 3] = 0
# 	source[511-r, 511-(radius-round((radius**2 - (radius-r)**2)**(1/2))):, 3] = 0
# 	source[511-r, :radius-round((radius**2 - (radius-r)**2)**(1/2)), 3] = 0
# 	source[r, 511-(radius-round((radius**2 - (radius-r)**2)**(1/2))):, 3] = 0

# source = cv.putText(source, "+", (50, 200), cv.FONT_HERSHEY_SIMPLEX, 7, (255, 255, 255), 25, cv.LINE_AA)
# source = cv.putText(source, "-", (306, 200), cv.FONT_HERSHEY_SIMPLEX, 7, (255, 255, 255), 25, cv.LINE_AA)
# source = cv.putText(source, "%", (60, 446), cv.FONT_HERSHEY_SIMPLEX, 5, (255, 255, 255), 25, cv.LINE_AA)
# source = cv.putText(source, "=", (306, 456), cv.FONT_HERSHEY_SIMPLEX, 7, (255, 255, 255), 25, cv.LINE_AA)

# cv.imwrite('icon-512x512.png', source)

source = cv.imread('icon-512x512.png', cv.IMREAD_UNCHANGED)
cv.imwrite('icon-400x400.png', cv.resize(source, (400, 400)))
cv.imwrite('icon-384x384.png', cv.resize(source, (384, 384)))
cv.imwrite('icon-192x192.png', cv.resize(source, (192, 192)))
cv.imwrite('icon-144x144.png', cv.resize(source, (144, 144)))
cv.imwrite('icon-128x128.png', cv.resize(source, (128, 128)))
cv.imwrite('icon-96x96.png', cv.resize(source, (96, 96)))
cv.imwrite('icon-72x72.png', cv.resize(source, (72, 72)))
cv.imwrite('icon-32x32.png', cv.resize(source, (32, 32)))
cv.imwrite('icon-16x16.png', cv.resize(source, (16, 16)))
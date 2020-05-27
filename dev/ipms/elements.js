
class ImageLoadBox extends HTMLInputElement {
	constructor() {
		super();
		this.type = "file";
		this.accept = "image/*";
		this.multiple = true;
	}
}
customElements.define('image-load-box', ImageLoadBox, { extends: 'input'});

class ImageViewer extends HTMLCanvasElement {
	constructor() {
		super();
	}
}
customElements.define('image-viewer', ImageViewer, {extends: 'canvas'});
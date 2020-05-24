
class File {
	constructor(file) {
		this.object = file;
		this.fullname = file.name;
		this.pindex = this.fullname.lastIndexOf('.');
		this.filename = this.fullname.slice(0, this.pindex);
		this.extension = this.fullname.slice(this.pindex, );
	}
}
class ImageSlot {
	constructor (object) {
		this.object = object;
	}
	load (file) {
		var container = new FileReader();
		container.onload = (event) => {
			this.object.src = event.target.result;
		}
		container.readAsDataURL(file.object);
	}
}
var files;
var file;
var i = 0;
var image = new ImageSlot(document.getElementById('imageviewer'));
document.getElementById('files').addEventListener('change', event => {
	files = event.target.files;
	file = new File(event.target.files[0]);
	image.load(file);
});
document.getElementById('next').addEventListener('click', event => {
	i++;
	if (i >= files.length) {
		i = 0;
	}
	file = new File(files[i]);
	image.load(file);
});
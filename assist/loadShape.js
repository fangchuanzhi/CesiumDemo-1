window.onload = function() {
	//Sandcastle_Begin
	Cesium.Math.setRandomNumberSeed(1234);
	
	var entities = viewer.entities;
	// 纯色 椭球
	entities.add({
		position : Cesium.Cartesian3.fromDegrees(106.06, 31.6,  10.0),
		ellipsoid : {
			radii : new Cesium.Cartesian3(65000.0, 65000.0, 90000.0),
			material : Cesium.Color.fromRandom({alpha : 1.0})
		}
	});
	
	viewer.zoomTo(viewer.entities);
}
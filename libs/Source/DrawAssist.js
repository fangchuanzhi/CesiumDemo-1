define(['Cesium'], function(Cesium) {
	const DrawAssist = {
		version: '0.1',
		description: 'cesium辅助类',
		copyright: '2019-06-17'
	};

	DrawAssist.Tools = function(viewer, callback) {
		this.viewer = viewer;
		this.init();
	};

	DrawAssist.Tools.prototype.init = function(back) {
		//初始化事件
		const viewer = this.viewer;
		const scene = viewer.scene;
		this.drawingMode = null;
		this.measureMode = null;
		this.geodesic = new Cesium.EllipsoidGeodesic();
		this.handler = new Cesium.ScreenSpaceEventHandler(scene.canvas);

		this.dataSource = new Cesium.CustomDataSource('tempComponent');
		viewer.dataSources.add(this.dataSource);
		console.log(viewer.dataSources.indexOf(this.dataSource));
	};


	DrawAssist.Tools.prototype.draw = function(type) {
		if (!this.viewer) return console.error('this.viewer 未定义');
		this.deactivate();
		this.drawingMode = type;
		switch (type) {
			case this.DRAW_TYPE.Point:
				this.DrawPoint();
				break;
			case this.DRAW_TYPE.PolyLine:
			case this.DRAW_TYPE.Polygon:
			case this.DRAW_TYPE.Circle:
			case this.DRAW_TYPE.Rectangle:
				this.DrawGraphics();
				break;
			default:
				this.drawingMode = null;
				this.measureMode = null;
				break;
		}
	};

	/**
	 * 描点
	 * @param {Object} callback
	 */
	DrawAssist.Tools.prototype.DrawPoint = function(callback) {
		const viewer = this.viewer;
		const this_ = this;
		this.drawingMode = "point";
		this.handler.setInputAction(function(evt) {
			const ray = viewer.camera.getPickRay(evt.position);
			const mapPosition = this_.getMapPoint(ray);
			if (!mapPosition) return;
			this_.dataSource.entities.add({
				id: 'drawPoints' + Math.random(),
				name: '描点begin',
				position: Cesium.Cartesian3.fromDegrees(mapPosition.x, mapPosition.y, mapPosition.z),
				point: new Cesium.PointGraphics({
					color: Cesium.Color.SKYBLUE,
					pixelSize: 10,
					outlineColor: Cesium.Color.YELLOW,
					outlineWidth: 2,
					heightReference: Cesium.HeightReference.CLAMP_TO_GROUND
				}),
				description: '<img style="height: 200px;" src="static/imgs/marker_red.png">'
			});
		}, Cesium.ScreenSpaceEventType.LEFT_CLICK);
	};
	
	// 记录 在绘制类型为 polygon 时记录点击区域的坐标
	let clickPositionRecord ;
	/**
	 * 根据不同了类型，绘制不同矢量图层
	 * @param {Object} callback
	 */
	DrawAssist.Tools.prototype.DrawGraphics = function(callback) {

		const viewer = this.viewer;
		const this_ = this;
		let activeShapePoints = [];
		let activeShape, floatingPoint;
		this.handler.setInputAction(function(event) {
			if (!Cesium.Entity.supportsPolylinesOnTerrain(viewer.scene)) {
				return console.log('This browser does not support polylines on terrain.');
			}

			const ray = viewer.camera.getPickRay(event.position);
			const earthPosition = viewer.scene.globe.pick(ray, viewer.scene);
			// 用当前点击坐标 比对前一次
			if(this_.DRAW_TYPE.Polygon === this_.drawingMode){
				if(clickPositionRecord){
					if(Object.is(clickPositionRecord.x,earthPosition.x)){
						clickPositionRecord = earthPosition ;
						return
					}
					clickPositionRecord = earthPosition ;
				}else{
					clickPositionRecord = earthPosition;
				}
			}
			
			if (Cesium.defined(earthPosition)) {
				if (activeShapePoints.length === 0) {
					floatingPoint = this_.createPoint(earthPosition);
					activeShapePoints.push(earthPosition);
									
					const dynamicPositions = new Cesium.CallbackProperty(function() {
						return activeShapePoints;
					}, false);
					activeShape = this_.drawShape(dynamicPositions,activeShapePoints);
				}

				activeShapePoints.push(earthPosition);
				this_.createPoint(earthPosition);
			}

		}, Cesium.ScreenSpaceEventType.LEFT_CLICK);

		this.handler.setInputAction(function(event) {
			if (Cesium.defined(floatingPoint)) {
				const ray = viewer.camera.getPickRay(event.endPosition);
				const newPosition = viewer.scene.globe.pick(ray, viewer.scene);
				if (Cesium.defined(newPosition)) {
					floatingPoint.position.setValue(newPosition);
					activeShapePoints.pop();
					activeShapePoints.push(newPosition);
				}
			}
		}, Cesium.ScreenSpaceEventType.MOUSE_MOVE);
		
		// remove the track and entity on the default behavior in Cesium
		// reference site https://webiks.com/remove-default-double-click-behavior-in-cesium/
		this.handler.setInputAction(function(movement) {
			viewer.trackedEntity = undefined;
		}, Cesium.ScreenSpaceEventType.LEFT_DOUBLE_CLICK);

		this.handler.setInputAction(function() {
			terminateShape();
		}, Cesium.ScreenSpaceEventType.RIGHT_CLICK);

		function terminateShape() {
			activeShapePoints.pop();
			this_.drawShape(activeShapePoints,activeShapePoints);
			viewer.entities.remove(floatingPoint);
			viewer.entities.remove(activeShape);
			floatingPoint = undefined;
			activeShape = undefined;
			activeShapePoints = [];
		}		
	};
	
	/**
	 * 获取地图上的 经纬度，高度 （x,y,z）
	 * @param {Object} ray
	 */
	DrawAssist.Tools.prototype.getMapPoint = function(ray) {
		const viewer = this.viewer;
		const cartesian = viewer.scene.globe.pick(ray, viewer.scene);
		if (!cartesian) {
			return null;
		}

		const cartographic = Cesium.Cartographic.fromCartesian(cartesian);
		const lng = Cesium.Math.toDegrees(cartographic.longitude); //经度值
		const lat = Cesium.Math.toDegrees(cartographic.latitude); //纬度值
		//cartographic.height的值为地形高度。
		return {
			x: lng,
			y: lat,
			z: cartographic.height
		};
	};

	DrawAssist.Tools.prototype.createPoint = function(worldPosition) {
		return this.dataSource.entities.add({
			position: worldPosition,
			point: {
				color: Cesium.Color.WHITE,
				pixelSize: 5,
				heightReference: Cesium.HeightReference.CLAMP_TO_GROUND
			}
		});
	};

	/**
	 * 执行线，面，圆，矩形的绘制操作
	 * @param {Object} positionData
	 * @param {Object} activeShapePoints
	 */
	DrawAssist.Tools.prototype.drawShape = function(positionData,activeShapePoints) {
		switch (this.drawingMode) {
			case this.DRAW_TYPE.PolyLine:
				return this.dataSource.entities.add({
					polyline: {
						positions: positionData,
						clampToGround: true,
						width: 3
					}
				});
			case this.DRAW_TYPE.Polygon:
				return this.dataSource.entities.add({
					polygon: {
						hierarchy: positionData,
						material: new Cesium.ColorMaterialProperty(Cesium.Color.WHITE.withAlpha(0.7))
					}
				});
			case this.DRAW_TYPE.Circle:
				//当positionData为数组时绘制最终图，如果为function则绘制动态图
				var value = typeof positionData.getValue === 'function' ? positionData.getValue(0) : positionData;
				return this.dataSource.entities.add({
					position: activeShapePoints[0],
					name: 'Blue translucent, rotated, and extruded ellipse with outline',
					type: 'Selection tool',
					ellipse: {
						semiMinorAxis: new Cesium.CallbackProperty(function() {
							//半径 两点间距离
							var r = Math.sqrt(Math.pow(value[0].x - value[value.length - 1].x, 2) + Math.pow(value[0].y - value[value
								.length -
								1].y, 2));
							return r ? r : r + 1;
						}, false),
						semiMajorAxis: new Cesium.CallbackProperty(function() {
							var r = Math.sqrt(Math.pow(value[0].x - value[value.length - 1].x, 2) + Math.pow(value[0].y - value[value
								.length -
								1].y, 2));
							return r ? r : r + 1;
						}, false),
						material: Cesium.Color.BLUE.withAlpha(0.5),
						outline: true
					}
				});
			case this.DRAW_TYPE.Rectangle:
				//当positionData为数组时绘制最终图，如果为function则绘制动态图
				var arr = typeof positionData.getValue === 'function' ? positionData.getValue(0) : positionData;
				if(arr.length<2){
					return
				}
				return this.dataSource.entities.add({
					name: 'Blue translucent, rotated, and extruded ellipse with outline',
					rectangle: {
						coordinates: new Cesium.CallbackProperty(function() {
							var obj = Cesium.Rectangle.fromCartesianArray(arr);
							//if(obj.west==obj.east){ obj.east+=0.000001};
							//if(obj.south==obj.north){obj.north+=0.000001};
							return obj;
						}, false),
						material: Cesium.Color.RED.withAlpha(0.5)
					}
				});
			default:
				return;
		}
	};

	/**
	 * 根据类型开始绘制测量矢量图层
	 * @param {Object} type
	 */
	DrawAssist.Tools.prototype.measure = function(type) {
		this.deactivate();
		this.measureMode = type;
		this.DrawMeasureGraphics();
	};
	DrawAssist.Tools.prototype.measureForArea = function(type) {
		this.deactivate();
		this.measureMode = type;
		this.DrawMeasureGraphicsArea();
	};
	
	/**
	 * 实现测量面积功能
	 */
	DrawAssist.Tools.prototype.DrawMeasureGraphicsArea = function() {
				var tooltip = document.getElementById("toolTip");
					var isDraw = false;
					var polygonPath = [];
					var polygon = null;
					var AllEnities = [];
					let this_ = this;
					let viewer = this.viewer;
					let activeShape,floatingPoint;
					//var handler = viewer.screenSpaceEventHandler;
					this.handler.setInputAction(function(movement) {
						//新增部分
						var position1;
						var cartographic;
						var ray = viewer.scene.camera.getPickRay(movement.endPosition);
						if (ray)
							position1 = viewer.scene.globe.pick(ray, viewer.scene);
						if (position1)
							cartographic = Cesium.Ellipsoid.WGS84.cartesianToCartographic(position1);
						if (cartographic) {
							//海拔
							var height = viewer.scene.globe.getHeight(cartographic);
							var point = Cesium.Cartesian3.fromDegrees(cartographic.longitude / Math.PI * 180, cartographic.latitude /
								Math.PI * 180, height);
							if (isDraw) {
								tooltip.style.left = movement.endPosition.x + 10 + "px";
								tooltip.style.top = movement.endPosition.y + 20 + "px";
								tooltip.style.display = "block";

								if (polygonPath.length < 2) {
									return;
								}
								if (!Cesium.defined(polygon)) {
									polygonPath.push(point);
									polygon = new CreatePolygon(polygonPath, Cesium);
									AllEnities.push(polygon);
								} else {
									polygon.path.pop();
									polygon.path.push(point);
									AllEnities.push(polygon);
								}
								if (polygonPath.length >= 2) {
									tooltip.innerHTML = '<p>双击确定终点</p>';
								}
							}
						}

					}, Cesium.ScreenSpaceEventType.MOUSE_MOVE);
					this.handler.setInputAction(function(movement) {
						isDraw = true;
						//新增部分
						var position1;
						var cartographic;
						var ray = viewer.scene.camera.getPickRay(movement.position);
						if (ray)
							position1 = viewer.scene.globe.pick(ray, viewer.scene);
						if (position1)
							cartographic = Cesium.Ellipsoid.WGS84.cartesianToCartographic(position1);
						if (cartographic) {
							//海拔
							var height = viewer.scene.globe.getHeight(cartographic);
							var point = Cesium.Cartesian3.fromDegrees(cartographic.longitude / Math.PI * 180, cartographic.latitude /
								Math.PI * 180, height);
							if (isDraw) {
								polygonPath.push(point);
								floatingPoint = this_.dataSource.entities.add({
									position: point,
									point: {
										show: true,
										color: Cesium.Color.SKYBLUE,
										pixelSize: 3,
										outlineColor: Cesium.Color.YELLOW,
										outlineWidth: 1
									},
								});

								AllEnities.push(floatingPoint);
							}
						}


					}, Cesium.ScreenSpaceEventType.LEFT_CLICK);
					this.handler.setInputAction(function() {
						// this_.handler.removeInputAction(Cesium.ScreenSpaceEventType.LEFT_CLICK);
						// this_.handler.removeInputAction(Cesium.ScreenSpaceEventType.LEFT_DOUBLE_CLICK);

						if (polygonPath.length >= 2) {
							var label = String(countAreaInCartesian3(polygon.path));
							label = label.substr(0, label.indexOf(".", 0));
							var text;
							if (label.length < 6)
								text = label + "平方米";
							else {
								label = String(label / 1000000);
								label = label.substr(0, label.indexOf(".", 0) + 3);
								text = label + "平方公里"
							}

							var textArea = text;
							activeShape = this_.dataSource.entities.add({
								name: '多边形面积',
								position: polygon.path[polygon.path.length - 1],
								point: {
									pixelSize: 5,
									color: Cesium.Color.RED,
									outlineColor: Cesium.Color.WHITE,
									outlineWidth: 2,
									heightReference: Cesium.HeightReference.CLAMP_TO_GROUND
								},
								label: {
									text: textArea,
									font: '18px sans-serif',
									fillColor: Cesium.Color.GOLD,
									style: Cesium.LabelStyle.FILL_AND_OUTLINE,
									outlineWidth: 2,
									verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
									pixelOffset: new Cesium.Cartesian2(20, -40)
								}
							});

							AllEnities.push(activeShape);

						}

						viewer.trackedEntity = undefined;
						isDraw = false;
						tooltip.style.display = 'none';
						this_.measureForArea('MeasureTerrainArea');
					}, Cesium.ScreenSpaceEventType.LEFT_DOUBLE_CLICK);
					
					var CreatePolygon = (function() {
						function _(positions, cesium) {
							if (!Cesium.defined(positions)) {
								throw new Cesium.DeveloperError('positions is required!');
							}
							if (positions.length < 3) {
								throw new Cesium.DeveloperError('positions 的长度必须大于等于3');
							}

							this.options = {
								polygon: {
									show: true,
									hierarchy: undefined,
									outline: true,
									outlineColor: Cesium.Color.WHITE,
									outlineWidth: 2,
									material: Cesium.Color.YELLOW.withAlpha(0.4)
								}
							};
							this.path = positions;
							this.hierarchy = positions;
							this._init();
						}

						_.prototype._init = function() {
							var _self = this;
							var _update = function() {
								return _self.hierarchy;
							};
							//实时更新polygon.hierarchy
							this.options.polygon.hierarchy = new Cesium.CallbackProperty(_update, false);
							var oo = viewer.entities.add(this.options);
							AllEnities.push(oo);
						};

						return _;
					})();

					//微元法求面积
					var countAreaInCartesian3 = function(ps) {
						var s = 0;
						for (var i = 0; i < ps.length; i++) {
							var p1 = ps[i];
							var p2;
							if (i < ps.length - 1)
								p2 = ps[i + 1];
							else
								p2 = ps[0];
							s += p1.x * p2.y - p2.x * p1.y;
						}
						return Math.abs(s / 2);
					}	
	
	};
	
	
	DrawAssist.Tools.prototype.DrawMeasureGraphics = function() {
		const viewer = this.viewer;
		const this_ = this;
		let activeShapePoints = [];
		let tempPoints = [];
		let activeShape, floatingPoint;
		let measureDistance = 0,
			floatDistance = 0;
		this.handler.setInputAction(function(event) {
			if (!Cesium.Entity.supportsPolylinesOnTerrain(viewer.scene)) {
				return console.log('This browser does not support polylines on terrain.');
			}
			const ray = viewer.camera.getPickRay(event.position);
			const earthPosition = viewer.scene.globe.pick(ray, viewer.scene);
			if (Cesium.defined(earthPosition)) {
				if (activeShapePoints.length === 0) {
					floatingPoint = this_.createMeasurePoint(earthPosition);
					if (this_.measureMode === this_.MEASURE_TYPE.MEASURE_DISTANCE) {
						floatingPoint.label = {
							text: new Cesium.CallbackProperty(function(time) {
								let distance = floatDistance = this_.getLatestLength(activeShapePoints);
								return ((distance + measureDistance) / 1000).toFixed(2) + ' km';
							}, false),
							showBackground: true,
							backgroundColor: new Cesium.Color(0, 0, 0, 0.5),
							backgroundPadding: new Cesium.Cartesian2(7, 5),
							font: '16px sans-serif',
						};

						this_.createLabel(earthPosition, '起点')
					}

					activeShapePoints.push(earthPosition);
					const dynamicPositions = new Cesium.CallbackProperty(function() {
						return activeShapePoints;
					}, false);
					activeShape = this_.drawMeasureShape(dynamicPositions);
				}
				if (activeShapePoints.length > 1 && this_.measureMode === this_.MEASURE_TYPE.MEASURE_DISTANCE) {
					measureDistance += floatDistance;
					this_.createLabel(earthPosition, (measureDistance / 1000).toFixed(2) + ' km');
				}
				activeShapePoints.push(earthPosition);
				this_.createMeasurePoint(earthPosition);
			}

		}, Cesium.ScreenSpaceEventType.LEFT_CLICK);
			
		this.handler.setInputAction(function(event) {
			if (Cesium.defined(floatingPoint)) {
				const ray = viewer.camera.getPickRay(event.endPosition);
				const newPosition = viewer.scene.globe.pick(ray, viewer.scene);
				if (Cesium.defined(newPosition)) {
					floatingPoint.position.setValue(newPosition);
					activeShapePoints.pop();
					activeShapePoints.push(newPosition);
				}
			}
		}, Cesium.ScreenSpaceEventType.MOUSE_MOVE);

		this.handler.setInputAction(function() {
			terminateShape();
		}, Cesium.ScreenSpaceEventType.RIGHT_CLICK);

		function terminateShape() {
			activeShapePoints.pop();
			this_.drawMeasureShape(activeShapePoints);
			this_.dataSource.entities.remove(floatingPoint);
			this_.dataSource.entities.remove(activeShape);
			floatingPoint = undefined;
			activeShape = undefined;
			activeShapePoints = [];
			measureDistance = 0;
		}	
	};
	
	/**
	 * 根据类型绘制 测量图形
	 * @param {Object} positionData
	 * @param {Object} callback
	 */
	DrawAssist.Tools.prototype.drawMeasureShape = function(positionData,callback) {
		console.log("draw shape");
		switch (this.measureMode) {
			case this.MEASURE_TYPE.MEASURE_DISTANCE:
				return this.dataSource.entities.add({
					polyline: {
						positions: positionData,
						clampToGround: true,
						width: 3
					}
				});
			case this.MEASURE_TYPE.MEASURE_AREA:
				if(positionData.length<2){
					return
				}
				return this.dataSource.entities.add({
					polygon: {
						hierarchy: positionData,
						material: new Cesium.ColorMaterialProperty(Cesium.Color.WHITE.withAlpha(0.7))
					}
				});				
			default:
				return;
		}
	};

	DrawAssist.Tools.prototype.getLatestLength = function(activeShapePoints) {
		const length = activeShapePoints.length;
		const endPoint = activeShapePoints[length - 1];
		const startPoint = activeShapePoints[length - 2];
		const startCartographic = Cesium.Cartographic.fromCartesian(startPoint);
		const endCartographic = Cesium.Cartographic.fromCartesian(endPoint);
		this.geodesic.setEndPoints(startCartographic, endCartographic);
		return Math.round(this.geodesic.surfaceDistance);
	};

	/**
	 * 绘制测量中的点图形
	 * @param {Object} worldPosition
	 * @param {Object} callback
	 */
	DrawAssist.Tools.prototype.createMeasurePoint = function(worldPosition, callback) {
		return this.dataSource.entities.add({
			position: worldPosition,
			point: {
				color: Cesium.Color.WHITE,
				pixelSize: 8,
				outlineColor: Cesium.Color.RED,
				outlineWidth: 3,
				heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
				scaleByDistance: new Cesium.NearFarScalar(0, 0, 1, 1)
			}
		});
	};

	/**
	 * 绘制测量后的提示框
	 * @param {Object} worldPosition
	 * @param {Object} text
	 */
	DrawAssist.Tools.prototype.createLabel = function(worldPosition, text) {
		return this.dataSource.entities.add({
			position: worldPosition,
			label: {
				text: text,
				showBackground: true,
				backgroundColor: new Cesium.Color(1, 1, 1, 0.7),
				backgroundPadding: new Cesium.Cartesian2(7, 5),
				font: '16px sans-serif',
				fillColor: Cesium.Color.BLACK,
				outlineColor: Cesium.Color.BLACK,
				pixelOffset: new Cesium.Cartesian2(-15, -15)
			}
		});
	};

	/**
	 * 清除已经注册的事件
	 */
	DrawAssist.Tools.prototype.deactivate = function() {
		if (this.handler) {
			this.handler.removeInputAction(Cesium.ScreenSpaceEventType.LEFT_CLICK);
			this.handler.removeInputAction(Cesium.ScreenSpaceEventType.LEFT_DOUBLE_CLICK);
			this.handler.removeInputAction(Cesium.ScreenSpaceEventType.RIGHT_CLICK);	
		}
		this.drawingMode = null;
	};
	
	/**
	 * 定义绘制类型
	 */
	DrawAssist.Tools.prototype.DRAW_TYPE = {
		Point: 'Point',
		PolyLine: 'PolyLine',
		Polygon: 'Polygon',
		Circle: 'Circle',
		Rectangle: 'Rectangle'
	};

	/**
	 * 定义测距的类型
	 */
	DrawAssist.Tools.prototype.MEASURE_TYPE = {
		MEASURE_DISTANCE: 'MeasureTerrainDistance',
		MEASURE_AREA: 'MeasureTerrainArea'
	};
	
	return DrawAssist;
});

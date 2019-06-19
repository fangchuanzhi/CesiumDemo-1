> CESIUMJS
## Cesium demo
#### CesiumJS 制作点，线，面，圆，矩形，测距等功能
#### 加载gltf 数据 增加模型到地图
#### 使用entities 加载空间

######  The following error occurred while drawing the polygon and rectangle.

```
An error occurred while rendering. Rendering has stopped.
DeveloperError: normalized result is not a number
Error
    at new DeveloperError (http://127.0.0.1:8848/cesium/libs/Source/Core/DeveloperError.js:43:19)
    at Function.Cartesian3.normalize (http://127.0.0.1:8848/cesium/libs/Source/Core/Cartesian3.js:421:19)
    at Ellipsoid.geodeticSurfaceNormalCartographic (http://127.0.0.1:8848/cesium/libs/Source/Core/Ellipsoid.js:353:27)
    at Ellipsoid.cartographicToCartesian (http://127.0.0.1:8848/cesium/libs/Source/Core/Ellipsoid.js:390:14)
    at Function.Rectangle.subsample (http://127.0.0.1:8848/cesium/libs/Source/Core/Rectangle.js:832:36)
    at Function.BoundingSphere.fromRectangle3D (http://127.0.0.1:8848/cesium/libs/Source/Core/BoundingSphere.js:308:35)
    at Object.ApproximateTerrainHeights.getBoundingSphere (http://127.0.0.1:8848/cesium/libs/Source/Core/ApproximateTerrainHeights.js:148:37)
    at GroundPrimitive.update (http://127.0.0.1:8848/cesium/libs/Source/Scene/GroundPrimitive.js:688:68)
    at PrimitiveCollection.update (http://127.0.0.1:8848/cesium/libs/Source/Scene/PrimitiveCollection.js:369:27)
    at OrderedGroundPrimitiveCollection.update (http://127.0.0.1:8848/cesium/libs/Source/Scene/OrderedGroundPrimitiveCollection.js:183:28)
```

I have been looking for a long time, the final solution is as follows
```
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
```
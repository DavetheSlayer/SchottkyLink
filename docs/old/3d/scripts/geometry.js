const ID_SCHOTTKY_SPHERE = 0;
const ID_BASE_SPHERE = 1;
const ID_TRANSFORM_BY_PLANES = 2;
const ID_TRANSFORM_BY_SPHERES = 3;
const ID_COMPOUND_PARABOLIC  = 4;
const ID_COMPOUND_LOXODROMIC = 5;
const ID_INFINITE_SPHERE = 6;
const ID_PARABOLIC = 7;
const ID_LOXODROMIC = 8;
const ID_MOD_COMPOUND_LOXODROMIC = 9;

const AXIS_X = 0;
const AXIS_Y = 1;
const AXIS_Z = 2;
const AXIS_RADIUS = 3;
const AXIS_PHI = 4;
const AXIS_THETA = 5;

const SPHERE_BODY = 0;
var Sphere = function(x, y, z, r){
    this.x = x;
    this.y = y;
    this.z = z;
    this.r = r;
}

Sphere.prototype = {
    set : function(axis, val){
	    if(axis == AXIS_X){
	        this.x = val;
	    }else if(axis == AXIS_Y){
	        this.y = val;
	    }else if(axis == AXIS_Z){
	        this.z = val;
	    }else if(axis == AXIS_RADIUS){
	        this.r = val;
	    }
    },
    get : function(axis){
	    if(axis == AXIS_X){
	        return this.x;
	    }else if(axis == AXIS_Y){
	        return this.y;
	    }else if(axis == AXIS_Z){
	        return this.z;
	    }else if(axis == AXIS_RADIUS){
	        return this.r;
	    }
    },
    getPosition: function(){
	    return [this.x, this.y, this.z];
    },
    getUniformArray: function(){
	    return [this.x, this.y, this.z, this.r];
    },
    setUniformLocation: function(uniLocation, gl, program, id, index){
	    // TODO: Remove id, because this argument is used only Sphere
	    if(id == ID_SCHOTTKY_SPHERE)
	        uniLocation.push(gl.getUniformLocation(program, 'u_schottkySphere'+ index));
	    else if(id == ID_BASE_SPHERE)
	        uniLocation.push(gl.getUniformLocation(program, 'u_baseSphere'+ index));
    },
    setUniformValues: function(uniLocation, gl, uniIndex){
	    gl.uniform4fv(uniLocation[uniIndex++], this.getUniformArray());
	    return uniIndex;
    },
    clone: function(){
	    return new Sphere(this.x, this.y, this.z, this.r);
    },
    exportJson: function(){
        return {"position": [this.x, this.y, this.z], "radius": this.r};
    },
    move: function(scene, componentId, selectedAxis, mouse, prevMouse, prevObject,
                   axisVecOnScreen, camera, canvasWidth, canvasHeight){
        switch(selectedAxis){
        case AXIS_RADIUS:
            //set radius
            //We assume that prevObject is Sphere.
	        var spherePosOnScreen = calcPointOnScreen(prevObject.getPosition(),
						                              camera, canvasWidth, canvasHeight);
	        var diffSphereAndPrevMouse = [spherePosOnScreen[0] - prevMouse[0],
				                          spherePosOnScreen[1] - prevMouse[1]];
	        var r = Math.sqrt(diffSphereAndPrevMouse[0] * diffSphereAndPrevMouse[0] +
			                  diffSphereAndPrevMouse[1] * diffSphereAndPrevMouse[1]);
	        var diffSphereAndMouse = [spherePosOnScreen[0] - mouse[0],
				                      spherePosOnScreen[1] - mouse[1]];
	        var distToMouse = Math.sqrt(diffSphereAndMouse[0] * diffSphereAndMouse[0] +
				                        diffSphereAndMouse[1] * diffSphereAndMouse[1]);
	        var d = distToMouse - r;

            var scaleFactor = 3;
	        //TODO: calculate tangent sphere
	        this.r = prevObject.r + d * scaleFactor;
            break;
        case AXIS_X:
        case AXIS_Y:
        case AXIS_Z:
            // Move this sphere along the selected axis.
            var dx = mouse[0] - prevMouse[0];
            var dy = mouse[1] - prevMouse[1];
            var v = axisVecOnScreen[selectedAxis];
	        var lengthOnAxis = v[0] * dx + v[1] * dy;
	        var p = calcCoordOnAxis(camera, canvasWidth, canvasHeight,
				                    selectedAxis, v, prevObject.getPosition(),
				                    lengthOnAxis);
	        this.set(selectedAxis, p[selectedAxis]);
            break;
        }
    },
    getComponentFromId: function(id){
	    return this;
    },
    castRay: function(objectId, index, eye, ray, isect){
        return intersectSphere(objectId, index, SPHERE_BODY,
                               this.getPosition(), this.r,
                               eye, ray, isect);
    },
    calcAxisOnScreen: function(componentId, camera, width, height){
        return calcAxisOnScreen(this.getPosition(), camera, width, height);
    },
    getSurfacePoint: function(thetaRad, phiRad){
        //thetaRad [0, 2PI) phiRad[0, PI]
        let cosPhi = Math.cos(phiRad);
        let sinPhi = Math.sin(phiRad);
        let cosTheta = Math.cos(thetaRad);
        let sinTheta = Math.sin(thetaRad);
        return [this.x + this.r * sinPhi * cosTheta,
                this.y + this.r * cosPhi,
                this.z + this.r * sinPhi * sinTheta];
    },
    getAngles: function(surfacePoint){
        return [Math.atan2(-surfacePoint[2], -surfacePoint[0]) + Math.PI,
                Math.acos(surfacePoint[1] / this.r)];
    },
    contains: function(sphere){
        let d = vecLength(diff(this.getPosition(),
                               sphere.getPosition()));
        return d <= Math.abs(this.r - sphere.r);
    }
}

Sphere.createFromJson = function(obj){
    var p = obj['position'];
    return new Sphere(p[0], p[1], p[2], obj['radius']);
}


// A sphere which have infinite radius.
// It is expressed by plane.
var InfiniteSphere = function(center, theta, phi){
    this.center = center;
    this.theta = theta;
    this.phi = phi;

    this.rotationMat3;
    this.invRotationMat3;

    this.update();

    this.size = 1200;
}

const INFINITE_SPHERE_BODY = 0;

InfiniteSphere.prototype = {
    clone: function(){
        return new InfiniteSphere(this.center.slice(0), this.theta, this.phi);
    },
    update: function(){
	    var rotateX = getRotationXAxis(radians(this.theta));
	    var rotateY = getRotationYAxis(radians(this.phi));
	    this.rotationMat3 = prodMat3(rotateX, rotateY);
	    rotateX = getRotationXAxis(radians(-this.theta));
	    rotateY = getRotationYAxis(radians(-this.phi));
	    this.invRotationMat3 = prodMat3(rotateY, rotateX);
    },
    exportJson: function(){
        return {
            "center": this.center,
            "thetaDegree": this.theta,
            "phiDegree": this.phi
        }
    },
    getUniformArray: function(){
	    return this.center.concat([this.size]);
    },
    setUniformLocation: function(uniLocation, gl, program, id, index){
	    uniLocation.push(gl.getUniformLocation(program,
					                           'u_infiniteSphere'+ index));
	    uniLocation.push(gl.getUniformLocation(program,
					                           'u_rotateInfiniteSphereMat3'+ index));
	    uniLocation.push(gl.getUniformLocation(program,
					                           'u_invRotateInfiniteSphereMat3'+ index));
    },
    setUniformValues: function(uniLocation, gl, uniIndex){
	    gl.uniform4fv(uniLocation[uniIndex++],
		              this.getUniformArray());
        gl.uniformMatrix3fv(uniLocation[uniIndex++],
			                false, this.rotationMat3);
        gl.uniformMatrix3fv(uniLocation[uniIndex++],
			                false, this.invRotationMat3);
	    return uniIndex;
    },
    castRay: function(objectId, index, eye, ray, isect){
        isect = intersectInfiniteSphere(objectId, index, 0,
			                            this.center,
			                            this.size,
			                            this.invRotationMat3,
			                            eye, ray, isect);
        return isect;
    },
    calcAxisOnScreen: function(componentId, camera, width, height){
        return calcAxisOnScreen(this.center, camera, width, height);
    },
    move: function(scene, componentId, selectedAxis, mouse, prevMouse, prevObject,
                   axisVecOnScreen, camera, canvasWidth, canvasHeight){
        if(selectedAxis == AXIS_THETA){
            var dx = mouse[0] - prevMouse[0];
            var dy = mouse[1] - prevMouse[1];
            this.theta = prevObject.theta + dx * 5.;
            this.update();
        }else if(selectedAxis == AXIS_PHI){
            var dx = mouse[0] - prevMouse[0];
            var dy = mouse[1] - prevMouse[1];
            this.phi = prevObject.phi + dy;
            this.update();
        }else{
            var dx = mouse[0] - prevMouse[0];
            var dy = mouse[1] - prevMouse[1];
            var v = axisVecOnScreen[selectedAxis];
	        var lengthOnAxis = v[0] * dx + v[1] * dy;
	        var p = calcCoordOnAxis(camera, canvasWidth, canvasHeight,
				                    selectedAxis, v, prevObject.center,
				                    lengthOnAxis);
	        this.center[selectedAxis] = p[selectedAxis];
        }
    }
}

InfiniteSphere.createFromJson = function(obj){
    return new InfiniteSphere(obj['center'].slice(0), obj['thetaDegree'], obj['phiDegree']);
}

const TRANSFORM_BY_PLANES1 = 0;
const TRANSFORM_BY_PLANES2 = 1;
// Initially planes are aligned along the z-axis
// Rotation is defined by theta and phi
// center is (0, 0, 0)
var TransformByPlanes = function(distToP1, distToP2, theta, phi, twist){
    this.center = [0, 0, 0];
    this.distToP1 = distToP1;
    this.distToP2 = distToP2;
    this.theta = theta; // Degree
    this.phi = phi; // Degree
    this.twist = twist; // Degree

    this.rotationMat3;
    this.invRotationMat3;
    this.twistMat3;
    this.invTwistMat3;

    this.update();

    this.size = 1200;
}

TransformByPlanes.createFromJson = function(obj){
    return new TransformByPlanes(obj['distToP1'],
				                 obj['distToP2'],
				                 obj['thetaDegree'],
				                 obj['phiDegree'],
				                 obj['twistDegree']);
}

TransformByPlanes.prototype = {
    clone: function(){
	    return new TransformByPlanes(this.distToP1,
                                     this.distToP2,
                                     this.theta,
                                     this.phi,
                                     this.twist);
    },
    exportJson: function(){
        return {"distToP1": this.distToP1,
                "distToP2": this.distToP2,
                "thetaDegree": this.theta,
                "phiDegree": this.phi,
                "twistDegree": this.twist,};
    },
    getUniformArray: function(){
	    return [this.center[0], this.center[1], this.center[2],
                this.distToP1, this.distToP2, this.size,
		        radians(this.theta), radians(this.phi), this.twist];
    },
    setUniformLocation: function(uniLocation, gl, program, id, index){
	    uniLocation.push(gl.getUniformLocation(program,
					                           'u_transformByPlanes'+ index));
	    uniLocation.push(gl.getUniformLocation(program,
					                           'u_rotatePlaneMat3'+ index));
	    uniLocation.push(gl.getUniformLocation(program,
					                           'u_invRotatePlaneMat3'+ index));
	    uniLocation.push(gl.getUniformLocation(program,
					                           'u_twistPlaneMat3'+ index));
	    uniLocation.push(gl.getUniformLocation(program,
					                           'u_invTwistPlaneMat3'+ index));
    },
    setUniformValues: function(uniLocation, gl, uniIndex){
	    gl.uniform1fv(uniLocation[uniIndex++],
		              this.getUniformArray());
        gl.uniformMatrix3fv(uniLocation[uniIndex++],
			                false, this.rotationMat3);
        gl.uniformMatrix3fv(uniLocation[uniIndex++],
			                false, this.invRotationMat3);
        gl.uniformMatrix3fv(uniLocation[uniIndex++],
			                false, this.twistMat3);
        gl.uniformMatrix3fv(uniLocation[uniIndex++],
			                false, this.invTwistMat3);
	    return uniIndex;
    },
    getComponentFromId: function(id){
	    return this;
    },
    update: function(){
	    var rotateX = getRotationXAxis(radians(this.theta));
	    var rotateY = getRotationYAxis(radians(this.phi));
	    this.rotationMat3 = prodMat3(rotateX, rotateY);
	    rotateX = getRotationXAxis(radians(-this.theta));
	    rotateY = getRotationYAxis(radians(-this.phi));
	    this.invRotationMat3 = prodMat3(rotateY, rotateX);
	    this.twistMat3 = getRotationZAxis(radians(this.twist));
	    this.invTwistMat3 = getRotationZAxis(radians(-this.twist));
    },
    castRay: function(objectId, index, eye, ray, isect){
        isect = intersectParallelPlanes(objectId, index,
                                        TRANSFORM_BY_PLANES1,
                                        TRANSFORM_BY_PLANES2,
                                        this.center, this.distToP1, this.distToP2,
                                        this.size, this.invRotationMat3, this.invTwistMat3,
                                        eye, ray, isect);

        return isect;
    },
    calcAxisOnScreen: function(componentId, camera, width, height){
        return calcAxisOnScreen([0, 0, 0], camera, width, height);
    },
    move: function(scene, componentId, selectedAxis, mouse, prevMouse, prevObject,
                   axisVecOnScreen, camera, canvasWidth, canvasHeight){
        if(selectedAxis == AXIS_Z){
            var dx = mouse[0] - prevMouse[0];
            var dy = mouse[1] - prevMouse[1];
            var v = axisVecOnScreen[selectedAxis];
	        var lengthOnAxis = v[0] * dx + v[1] * dy;
            if(componentId == TRANSFORM_BY_PLANES1){
                var p = calcCoordOnAxis(camera, canvasWidth, canvasHeight,
				                        selectedAxis, v, [0, 0, prevObject.distToP1],
				                        lengthOnAxis);
                this.distToP1 = p[selectedAxis];
            }else{
                var p = calcCoordOnAxis(camera, canvasWidth, canvasHeight,
				                        selectedAxis, v, [0, 0, prevObject.distToP2],
				                        lengthOnAxis);
                this.distToP2 = p[selectedAxis];
            }
        }
    }
}

const COMPOUND_PARABOLIC_INNER_SPHERE = 0;
const COMPOUND_PARABOLIC_OUTER_SPHERE = 1;
const COMPOUND_PARABOLIC_INVERTED_SPHERE = 2;
// Currently, we aligne the transformation along the z-axis only.
var CompoundParabolic = function(innerSphere, outerSphere, thetaDegree){
    // innerSphere and outer sphere is kissing
    this.inner = innerSphere;
    this.outer = outerSphere;
    this.theta = thetaDegree; //Degree

    this.inverted;
    this.rotationMat3;
    this.invRotationMat3;
    this.update();
}

CompoundParabolic.createFromJson = function(obj){
    return new CompoundParabolic(Sphere.createFromJson(obj['innerSphere']),
				                 Sphere.createFromJson(obj['outerSphere']),
				                 obj['thetaDegree']);
}

CompoundParabolic.prototype = {
    getUniformArray: function(){
	    return this.inner.getUniformArray().concat(this.outer.getUniformArray(),
						                           this.inverted.getUniformArray());
    },
    clone: function(){
        return new CompoundParabolic(this.inner.clone(), this.outer.clone(), this.theta);
    },
    exportJson: function(){
        return {"innerSphere": this.inner.exportJson(),
                "outerSphere": this.outer.exportJson(),
                "thetaDegree": this.theta};
    },
    update: function(){
	    this.inverted = sphereInvert(this.inner, this.outer);
	    this.rotationMat3 = getRotationZAxis(radians(this.theta));
	    this.invRotationMat3 = getRotationZAxis(radians(-this.theta));
    },
    setUniformLocation: function(uniLocation, gl, program, id, index){
	    uniLocation.push(gl.getUniformLocation(program,
					                           'u_compoundParabolic'+ index));
	    uniLocation.push(gl.getUniformLocation(program,
					                           'u_compoundRotateMat3'+ index));
	    uniLocation.push(gl.getUniformLocation(program,
					                           'u_invCompoundRotateMat3'+ index))
    },
    setUniformValues: function(uniLocation, gl, uniIndex){
	    gl.uniform4fv(uniLocation[uniIndex++],
		              this.getUniformArray());
        gl.uniformMatrix3fv(uniLocation[uniIndex++],
			                false, this.rotationMat3);
        gl.uniformMatrix3fv(uniLocation[uniIndex++],
			                false, this.invRotationMat3);
	    return uniIndex;
    },
    move: function(scene, componentId, selectedAxis, mouse, prevMouse, prevObject,
                   axisVecOnScreen, camera, canvasWidth, canvasHeight){
        switch(componentId){
        case COMPOUND_PARABOLIC_INNER_SPHERE:
	        if(selectedAxis == AXIS_RADIUS){
		        //set radius
		        var spherePosOnScreen = calcPointOnScreen(prevObject.inner.getPosition(),
							                              camera, canvasWidth, canvasHeight);
		        var diffSphereAndPrevMouse = [spherePosOnScreen[0] - prevMouse[0],
				                              spherePosOnScreen[1] - prevMouse[1]];
		        var r = Math.sqrt(diffSphereAndPrevMouse[0] * diffSphereAndPrevMouse[0] +
				                  diffSphereAndPrevMouse[1] * diffSphereAndPrevMouse[1]);
		        var diffSphereAndMouse = [spherePosOnScreen[0] - mouse[0],
					                      spherePosOnScreen[1] - mouse[1]];
		        var distToMouse = Math.sqrt(diffSphereAndMouse[0] * diffSphereAndMouse[0] +
				                            diffSphereAndMouse[1] * diffSphereAndMouse[1]);
		        var d = distToMouse - r;

		        var scaleFactor = 3;
		        //TODO: calculate tangent sphere
		        var nr = prevObject.inner.r + d * scaleFactor;

		        var dist = vecLength(diff(this.outer.getPosition(),
					                      this.inner.getPosition()));
		        if(dist <= this.outer.r - nr){
		            this.inner.r = nr;
		        }
	        }else{
		        var dx = mouse[0] - prevMouse[0];
		        var dy = mouse[1] - prevMouse[1];
		        var v = axisVecOnScreen[selectedAxis];
		        var lengthOnAxis = v[0] * dx + v[1] * dy;
		        var np = calcCoordOnAxis(camera, canvasWidth, canvasHeight,
					                     selectedAxis, v, prevObject.inner.getPosition(),
					                     lengthOnAxis);
		        var d = vecLength(diff(this.outer.getPosition(), np));
		        if(d <= this.outer.r - this.inner.r){
		            this.inner.set(selectedAxis, np[selectedAxis]);
		        }
	        }
            break;
        case COMPOUND_PARABOLIC_OUTER_SPHERE:
            this.outer.move(scene, componentId, selectedAxis, mouse, prevMouse, prevObject.outer,
                            axisVecOnScreen, camera, canvasWidth, canvasHeight);
            if(selectedAxis == AXIS_RADIUS){
                // Keep spheres kissing along the z-axis
                this.inner.set(AXIS_Z, prevObject.inner.get(AXIS_Z) + this.outer.r - prevObject.outer.r);
            }else{
                var d = prevObject.inner.get(selectedAxis) - prevObject.outer.get(selectedAxis);
                this.inner.set(selectedAxis, this.outer.get(selectedAxis) + d);
            }
            break;
        }
        this.update();
    },
    getComponentFromId: function(id){
	    if(id == COMPOUND_PARABOLIC_INNER_SPHERE){
	        return this.inner;
	    }else if(id == COMPOUND_PARABOLIC_OUTER_SPHERE){
	        return this.outer;
	    }else if(id == COMPOUND_PARABOLIC_INVERTED_SPHERE){
	        return this.inverted;
	    }
    },
    castRay: function(objectId, index, eye, ray, isect){
        isect = intersectOverlappingSphere(objectId, index,
                                           COMPOUND_PARABOLIC_INNER_SPHERE,
                                           COMPOUND_PARABOLIC_OUTER_SPHERE,
                                           this.inner, this.outer,
				                           eye, ray, isect);
        return isect;
    },
    calcAxisOnScreen: function(componentId, camera, width, height){
        return calcAxisOnScreen(this.getComponentFromId(componentId).getPosition(),
                                camera, width, height);
    },
}

const TRANSFORM_BY_SPHERES_INNER_SPHERE = 0;
const TRANSFORM_BY_SPHERES_OUTER_SPHERE = 1;
const TRANSFORM_BY_SPHERES_INVERTED_SPHERE = 2;

// Transformation defined by two spheres
// Parabolic or Loxodromic transformation
var TransformBySpheres = function(innerSphere, outerSphere){
    this.inner = innerSphere;
    this.outer = outerSphere;
    this.inverted;
    this.update();
}

TransformBySpheres.createFromJson = function(obj){
    return new TransformBySpheres(Sphere.createFromJson(obj['innerSphere']),
				                  Sphere.createFromJson(obj['outerSphere'])
				                 );
}

TransformBySpheres.prototype = {
    getUniformArray: function(){
	    return this.inner.getUniformArray().concat(this.outer.getUniformArray(),
						                           this.inverted.getUniformArray());
    },
    clone: function(){
	    return new TransformBySpheres(this.inner.clone(), this.outer.clone());
    },
    exportJson: function(){
        return {"innerSphere": this.inner.exportJson(),
                "outerSphere": this.outer.exportJson(),};
    },
    setUniformLocation: function(uniLocation, gl, program, id, index){
	    uniLocation.push(gl.getUniformLocation(program,
					                           'u_transformBySpheres'+ index));
    },
    setUniformValues: function(uniLocation, gl, uniIndex){
        gl.uniform4fv(uniLocation[uniIndex++], this.getUniformArray());
	    return uniIndex;
    },
    update: function(){
	    this.inverted = sphereInvert(this.inner, this.outer);
    },
    move: function(scene, componentId, selectedAxis, mouse, prevMouse, prevObject,
                   axisVecOnScreen, camera, canvasWidth, canvasHeight){
        switch(componentId){
        case TRANSFORM_BY_SPHERES_INNER_SPHERE:
	        if(selectedAxis == AXIS_RADIUS){
		        //set radius
		        var spherePosOnScreen = calcPointOnScreen(prevObject.inner.getPosition(),
							                              camera, canvasWidth, canvasHeight);
		        var diffSphereAndPrevMouse = [spherePosOnScreen[0] - prevMouse[0],
				                              spherePosOnScreen[1] - prevMouse[1]];
		        var r = Math.sqrt(diffSphereAndPrevMouse[0] * diffSphereAndPrevMouse[0] +
				                  diffSphereAndPrevMouse[1] * diffSphereAndPrevMouse[1]);
		        var diffSphereAndMouse = [spherePosOnScreen[0] - mouse[0],
					                      spherePosOnScreen[1] - mouse[1]];
		        var distToMouse = Math.sqrt(diffSphereAndMouse[0] * diffSphereAndMouse[0] +
				                            diffSphereAndMouse[1] * diffSphereAndMouse[1]);
		        var d = distToMouse - r;

		        var scaleFactor = 3;
		        //TODO: calculate tangent sphere
		        var nr = prevObject.inner.r + d * scaleFactor;

		        var dist = vecLength(diff(this.outer.getPosition(),
					                      this.inner.getPosition()));
		        if(dist <= this.outer.r - nr){
		            this.inner.r = nr;
		        }
	        }else{
		        var dx = mouse[0] - prevMouse[0];
		        var dy = mouse[1] - prevMouse[1];
		        var v = axisVecOnScreen[selectedAxis];
		        var lengthOnAxis = v[0] * dx + v[1] * dy;
		        var np = calcCoordOnAxis(camera, canvasWidth, canvasHeight,
					                     selectedAxis, v, prevObject.inner.getPosition(),
					                     lengthOnAxis);
		        var d = vecLength(diff(this.outer.getPosition(), np));
		        if(d <= this.outer.r - this.inner.r){
		            this.inner.set(selectedAxis, np[selectedAxis]);
		        }
	        }
            break;
        case TRANSFORM_BY_SPHERES_OUTER_SPHERE:
            this.outer.move(scene, componentId, selectedAxis,
			                mouse, prevMouse, prevObject.outer,
                            axisVecOnScreen, camera, canvasWidth, canvasHeight);
            // Keep spheres kissing along the z-axis
            if(selectedAxis == AXIS_RADIUS){
                this.inner.set(AXIS_Z, prevObject.inner.get(AXIS_Z) + this.outer.r - prevObject.outer.r);
            }else{
                var d = prevObject.inner.get(selectedAxis) - prevObject.outer.get(selectedAxis);
                this.inner.set(selectedAxis, this.outer.get(selectedAxis) + d);
            }
            break;
        }
        this.update();
    },
    getComponentFromId: function(id){
	    if(id == TRANSFORM_BY_SPHERES_INNER_SPHERE){
	        return this.inner;
	    }else if(id == TRANSFORM_BY_SPHERES_OUTER_SPHERE){
	        return this.outer;
	    }else if(id == TRANSFORM_BY_SPHERES_INVERTED_SPHERE){
	        return this.inverted;
	    }
    },
    castRay: function(objectId, index, eye, ray, isect){
        isect = intersectOverlappingSphere(objectId, index,
                                           TRANSFORM_BY_SPHERES_INNER_SPHERE,
                                           TRANSFORM_BY_SPHERES_OUTER_SPHERE,
                                           this.inner, this.outer,
				                           eye, ray, isect);
        return isect;
    },
    calcAxisOnScreen: function(componentId, camera, width, height){
        return calcAxisOnScreen(this.getComponentFromId(componentId).getPosition(),
                                camera, width, height);
    }
}

const PARABOLIC_INNER_SPHERE = 0;
const PARABOLIC_OUTER_SPHERE = 1;
const PARABOLIC_INVERTED_SPHERE = 2;

var Parabolic = function(outer, contactThetaDegree, contactPhiDegree, innerRadius){
    this.outer = outer;
    this.thetaRad = radians(contactThetaDegree);
    this.phiRad = radians(contactPhiDegree);
    this.innerRadius = innerRadius;

    this.update();
}

Parabolic.createFromJson = function(obj){
    return new Parabolic(Sphere.createFromJson(obj['outerSphere']),
                         obj['thetaDegree'],
                         obj['phiDegree'],
                         obj['innerRadius']);
}

Parabolic.prototype = {
    update: function(){
        let cosPhi = Math.cos(this.phiRad);
        let sinPhi = Math.sin(this.phiRad);
        let cosTheta = Math.cos(this.thetaRad);
        let sinTheta = Math.sin(this.thetaRad);
        //theta [0, 2PI) phi[0, PI]
        this.contactPoint = [this.outer.x + this.outer.r * sinPhi * cosTheta,
                             this.outer.y + this.outer.r * cosPhi,
                             this.outer.z + this.outer.r * sinPhi * sinTheta];
        this.inner = new Sphere(this.contactPoint[0] - this.innerRadius * sinPhi * cosTheta,
                                this.contactPoint[1] - this.innerRadius * cosPhi,
                                this.contactPoint[2] - this.innerRadius * sinPhi * sinTheta,
                                this.innerRadius);
        this.inverted = sphereInvert(this.inner, this.outer);
        this.sphereOnContactPoint = new Sphere(this.contactPoint[0],
                                               this.contactPoint[1],
                                               this.contactPoint[2],
                                               this.innerRadius);
        let innerP1 = sphereInvertOnPoint(this.inner.getSurfacePoint(this.thetaRad - (Math.PI) + Math.PI / 8.,
                                                                     this.phiRad - (Math.PI/2) + Math.PI /12.),
                                          this.sphereOnContactPoint);
        let innerP2 = sphereInvertOnPoint(this.inner.getSurfacePoint(this.thetaRad- (Math.PI) - Math.PI / 8,
                                                                     this.phiRad - (Math.PI/2) + Math.PI / 9.),
                                          this.sphereOnContactPoint);
        let innerP3 = sphereInvertOnPoint(this.inner.getSurfacePoint(this.thetaRad- (Math.PI) + Math.PI / 12.,
                                                                     this.phiRad - (Math.PI/2.) - Math.PI / 12),
                                          this.sphereOnContactPoint);
        let innerPlaneV1 = diff(innerP2, innerP1);
        let innerPlaneV2 = diff(innerP3, innerP1);
        let innerPlaneN = normalize3(cross(innerPlaneV1, innerPlaneV2));

        let invertedP1 = sphereInvertOnPoint(this.inverted.getSurfacePoint(this.thetaRad- (Math.PI) + Math.PI / 8,
                                                                           this.phiRad- (Math.PI/2) + Math.PI / 12.),
                                             this.sphereOnContactPoint);
        let invertedP2 = sphereInvertOnPoint(this.inverted.getSurfacePoint(this.thetaRad- (Math.PI) - Math.PI / 8,
                                                                           this.phiRad- (Math.PI/2) + Math.PI / 9.),
                                             this.sphereOnContactPoint);
        let invertedP3 = sphereInvertOnPoint(this.inverted.getSurfacePoint(this.thetaRad- (Math.PI) + Math.PI / 12.,
                                                                           this.phiRad - (Math.PI/2) - Math.PI / 12),
                                             this.sphereOnContactPoint);
        let invertedPlaneV1 = diff(invertedP2, invertedP1);
        let invertedPlaneV2 = diff(invertedP3, invertedP1);
        let invertedPlaneN = normalize3(cross(invertedPlaneV1, invertedPlaneV2));
        let invertedPlaneH = dot(invertedPlaneN, invertedP1);
        // http://physmath.main.jp/src/line-plane-intersection-point.html
        let t = (invertedPlaneH - dot(invertedPlaneN, innerP1)) / dot(invertedPlaneN, innerPlaneN);
        let isect = sum(innerP1, scale(innerPlaneN, t));
        this.translateDist = vecLength(diff(isect, innerP1));
        this.translatePoint = innerP1;
        this.invertedPoint = isect;
        let radX = this.phiRad + Math.PI / 2;
        let radY = this.thetaRad + Math.PI / 2;
        this.rotationMat3 = prodMat3(getRotationXAxis(radX),
                                     getRotationYAxis(radY));
        this.invRotationMat3 = prodMat3(getRotationYAxis(-radY),
                                        getRotationXAxis(-radX));

    },
    clone: function(){
        return new Parabolic(this.outer.clone(),
                             degrees(this.thetaRad),
                             degrees(this.phiRad),
                             this.innerRadius);
    },
    exportJson: function(){
        return {"outerSphere": this.inneouter.exportJson(),
                "thetaDegree": degrees(this.thetaRad),
                "phiDegree": degrees(this.phiRad),
                "innerRadius": this.innerRadius};
    },
    getUniformArray: function(){
        return this.inner.getUniformArray().concat(this.outer.getUniformArray(),
                                                   this.inverted.getUniformArray(),
                                                   this.sphereOnContactPoint.getUniformArray(),
                                                   this.contactPoint, [0],
                                                   this.translatePoint, [this.translateDist],
                                                   this.invertedPoint, [0]);
    },
    setUniformLocation: function(uniLocation, gl, program, id, index){
	    uniLocation.push(gl.getUniformLocation(program, 'u_parabolic'+ index));
        uniLocation.push(gl.getUniformLocation(program, 'u_parabolicRotationMat'+ index));
    },
    setUniformValues: function(uniLocation, gl, uniIndex){
        gl.uniform4fv(uniLocation[uniIndex++], this.getUniformArray());
        gl.uniformMatrix3fv(uniLocation[uniIndex++], false,
                            this.rotationMat3.concat(this.invRotationMat3));
	    return uniIndex;
    },
    move: function(scene, componentId, selectedAxis, mouse, prevMouse, prevObject,
                   axisVecOnScreen, camera, canvasWidth, canvasHeight){
        switch(componentId){
        case TRANSFORM_BY_SPHERES_INNER_SPHERE:
	        if(selectedAxis == AXIS_RADIUS){
		        //set radius
		        var spherePosOnScreen = calcPointOnScreen(prevObject.inner.getPosition(),
							                              camera, canvasWidth, canvasHeight);
		        var diffSphereAndPrevMouse = [spherePosOnScreen[0] - prevMouse[0],
				                              spherePosOnScreen[1] - prevMouse[1]];
		        var r = Math.sqrt(diffSphereAndPrevMouse[0] * diffSphereAndPrevMouse[0] +
				                  diffSphereAndPrevMouse[1] * diffSphereAndPrevMouse[1]);
		        var diffSphereAndMouse = [spherePosOnScreen[0] - mouse[0],
					                      spherePosOnScreen[1] - mouse[1]];
		        var distToMouse = Math.sqrt(diffSphereAndMouse[0] * diffSphereAndMouse[0] +
				                            diffSphereAndMouse[1] * diffSphereAndMouse[1]);
		        var d = distToMouse - r;

		        var scaleFactor = 3;
		        //TODO: calculate tangent sphere
		        var nr = prevObject.inner.r + d * scaleFactor;

		        var dist = vecLength(diff(this.outer.getPosition(),
					                      this.inner.getPosition()));
		        if(dist <= this.outer.r - nr){
		            this.inner.r = nr;
		        }
	        }
            break;
        case PARABOLIC_OUTER_SPHERE:
            this.outer.move(scene, componentId, selectedAxis,
			                mouse, prevMouse, prevObject.outer,
                            axisVecOnScreen, camera, canvasWidth, canvasHeight);
            // Keep spheres kissing along the z-axis
            if(selectedAxis == AXIS_RADIUS){
                this.inner.set(AXIS_Z, prevObject.inner.get(AXIS_Z) + this.outer.r - prevObject.outer.r);
            }else{
                var d = prevObject.inner.get(selectedAxis) - prevObject.outer.get(selectedAxis);
                this.inner.set(selectedAxis, this.outer.get(selectedAxis) + d);
            }
            break;
        }
        this.update();
    },
    getComponentFromId: function(id){
	    if(id == PARABOLIC_INNER_SPHERE){
	        return this.inner;
	    }else if(id == PARABOLIC_OUTER_SPHERE){
	        return this.outer;
	    }else if(id == PARABOLIC_INVERTED_SPHERE){
	        return this.inverted;
	    }
    },
    castRay: function(objectId, index, eye, ray, isect){
        isect = intersectOverlappingSphere(objectId, index,
                                           PARABOLIC_INNER_SPHERE,
                                           PARABOLIC_OUTER_SPHERE,
                                           this.inner, this.outer,
				                           eye, ray, isect);
        return isect;
    },
    calcAxisOnScreen: function(componentId, camera, width, height){
        return calcAxisOnScreen(this.getComponentFromId(componentId).getPosition(),
                                camera, width, height);
    }
}

const LOXODROMIC_INNER_SPHERE = 0;
const LOXODROMIC_OUTER_SPHERE = 1;
const LOXODROMIC_INVERTED_SPHERE = 2;

// Transformation defined by two spheres
var Loxodromic = function(innerSphere, outerSphere){
    this.inner = innerSphere;
    this.outer = outerSphere;
    this.inverted;
    this.update();
}

Loxodromic.createFromJson = function(obj){
    return new Loxodromic(Sphere.createFromJson(obj['innerSphere']),
				          Sphere.createFromJson(obj['outerSphere'])
				         );
}

Loxodromic.prototype = {
    getUniformArray: function(){
	    return this.inner.getUniformArray().concat(this.outer.getUniformArray(),
						                           this.inverted.getUniformArray(),
                                                   this.s3.getUniformArray(),
						                           this.s4.getUniformArray(),
						                           this.p, [0],
						                           this.q1, [0],
						                           this.q2, [0],
                                                   this.sphereOnFixedPoint.getUniformArray(),
                                                   [this.scalingFactor, 0, 0, 0],
                                                   this.concentricInner.getUniformArray(),
                                                   this.concentricInverted.getUniformArray(),
                                                   this.innerFixedPoint, [0],
                                                   this.outerFixedPoint, [0]);
    },
    clone: function(){
	    return new Loxodromic(this.inner.clone(), this.outer.clone());
    },
    exportJson: function(){
        return {"innerSphere": this.inner.exportJson(),
                "outerSphere": this.outer.exportJson(),};
    },
    setUniformLocation: function(uniLocation, gl, program, id, index){
	    uniLocation.push(gl.getUniformLocation(program,
					                           'u_loxodromic'+ index));
    },
    setUniformValues: function(uniLocation, gl, uniIndex){
        gl.uniform4fv(uniLocation[uniIndex++], this.getUniformArray());
	    return uniIndex;
    },
    update: function(){
        this.inverted = sphereInvert(this.inner, this.outer);
        this.p = sum(this.inverted.getPosition(), [0, this.inverted.r + 200, -100]);
        this.q1 = sum(this.inverted.getPosition(), [-500, -this.inverted.r - 200, -100]);
        this.q2 = sum(this.inverted.getPosition(), [this.inverted.r + 200, 0, -110]);

	    this.pInnerInv = sphereInvertOnPoint(this.p, this.inner);
	    this.pOuterInv = sphereInvertOnPoint(this.p, this.outer);
	    this.s3 = makeSphereFromPoints(this.p, this.pInnerInv, this.pOuterInv, this.q1);
	    this.s4 = makeSphereFromPoints(this.p, this.pInnerInv, this.pOuterInv, this.q2);

        let lineDir = normalize3(diff(this.outer.getPosition(),
                                      this.inner.getPosition()));
        let lineP = this.inner.getPosition();
        let [p1, p2] = calcLineSphereIntersection(lineP, lineDir, this.s3);
        let [p3, p4] = calcLineSphereIntersection(lineP, lineDir, this.s4);

        if(vecLength(diff(p1, this.inverted.getPosition())) < this.inverted.r){
            this.innerFixedPoint = p1;
            this.outerFixedPoint = p2;
        }else{
            this.innerFixedPoint = p2;
            this.outerFixedPoint = p1;
        }
        this.sphereOnFixedPoint = new Sphere(this.outerFixedPoint[0],
                                             this.outerFixedPoint[1],
                                             this.outerFixedPoint[2],
                                             this.inner.r);
        this.concentricInner = sphereInvert(this.inner, this.sphereOnFixedPoint);
        this.concentricInverted = sphereInvert(this.inverted, this.sphereOnFixedPoint);
        this.scalingFactor = this.concentricInverted.r / this.concentricInner.r;
        console.log('sphere');
        console.log(this.s3);
        console.log(this.s4);
        console.log('sphereOnFixedPoint');
        console.log(this.sphereOnFixedPoint);
        console.log('p');
        console.log(p1);
        console.log(p2);
        console.log(p3);
        console.log(p4);
        console.log('concentric');
        console.log(this.concentricInner);
        console.log(this.concentricInverted);
        console.log(this.scalingFactor);
    },
    move: function(scene, componentId, selectedAxis, mouse, prevMouse, prevObject,
                   axisVecOnScreen, camera, canvasWidth, canvasHeight){
        switch(componentId){
        case LOXODROMIC_INNER_SPHERE:
	        if(selectedAxis == AXIS_RADIUS){
		        //set radius
		        var spherePosOnScreen = calcPointOnScreen(prevObject.inner.getPosition(),
							                              camera, canvasWidth, canvasHeight);
		        var diffSphereAndPrevMouse = [spherePosOnScreen[0] - prevMouse[0],
				                              spherePosOnScreen[1] - prevMouse[1]];
		        var r = Math.sqrt(diffSphereAndPrevMouse[0] * diffSphereAndPrevMouse[0] +
				                  diffSphereAndPrevMouse[1] * diffSphereAndPrevMouse[1]);
		        var diffSphereAndMouse = [spherePosOnScreen[0] - mouse[0],
					                      spherePosOnScreen[1] - mouse[1]];
		        var distToMouse = Math.sqrt(diffSphereAndMouse[0] * diffSphereAndMouse[0] +
				                            diffSphereAndMouse[1] * diffSphereAndMouse[1]);
		        var d = distToMouse - r;

		        var scaleFactor = 3;
		        //TODO: calculate tangent sphere
		        var nr = prevObject.inner.r + d * scaleFactor;

		        var dist = vecLength(diff(this.outer.getPosition(),
					                      this.inner.getPosition()));
		        if(dist <= this.outer.r - nr){
		            this.inner.r = nr;
		        }
	        }else{
		        var dx = mouse[0] - prevMouse[0];
		        var dy = mouse[1] - prevMouse[1];
		        var v = axisVecOnScreen[selectedAxis];
		        var lengthOnAxis = v[0] * dx + v[1] * dy;
		        var np = calcCoordOnAxis(camera, canvasWidth, canvasHeight,
					                     selectedAxis, v, prevObject.inner.getPosition(),
					                     lengthOnAxis);
		        var d = vecLength(diff(this.outer.getPosition(), np));
		        if(d <= this.outer.r - this.inner.r){
		            this.inner.set(selectedAxis, np[selectedAxis]);
		        }
	        }
            break;
        case LOXODROMIC_OUTER_SPHERE:
            this.outer.move(scene, componentId, selectedAxis,
			                mouse, prevMouse, prevObject.outer,
                            axisVecOnScreen, camera, canvasWidth, canvasHeight);
            // Keep spheres kissing along the z-axis
            if(selectedAxis == AXIS_RADIUS){
                this.inner.set(AXIS_Z, prevObject.inner.get(AXIS_Z) + this.outer.r - prevObject.outer.r);
            }else{
                var d = prevObject.inner.get(selectedAxis) - prevObject.outer.get(selectedAxis);
                this.inner.set(selectedAxis, this.outer.get(selectedAxis) + d);
            }
            break;
        }
        this.update();
    },
    getComponentFromId: function(id){
	    if(id == LOXODROMIC_INNER_SPHERE){
	        return this.inner;
	    }else if(id == LOXODROMIC_OUTER_SPHERE){
	        return this.outer;
	    }else if(id == LOXODROMIC_INVERTED_SPHERE){
	        return this.inverted;
	    }
    },
    castRay: function(objectId, index, eye, ray, isect){
        isect = intersectOverlappingSphere(objectId, index,
                                           LOXODROMIC_INNER_SPHERE,
                                           LOXODROMIC_OUTER_SPHERE,
                                           this.inner, this.outer,
				                           eye, ray, isect);
        return isect;
    },
    calcAxisOnScreen: function(componentId, camera, width, height){
        return calcAxisOnScreen(this.getComponentFromId(componentId).getPosition(),
                                camera, width, height);
    }
}

var CompoundLoxodromic = function(inner, outer, p, q1, q2){
    this.inner = inner;
    this.outer = outer;
    this.p = p;
    this.q1 = q1;
    this.q2 = q2;
    this.update();
}

const COMPOUND_LOXODROMIC_INNER_SPHERE = 0;
const COMPOUND_LOXODROMIC_OUTER_SPHERE = 1;
const COMPOUND_LOXODROMIC_INVERTED_SPHERE = 2;
const COMPOUND_LOXODROMIC_S3 = 3;
const COMPOUND_LOXODROMIC_S4 = 4;
const COMPOUND_LOXODROMIC_POINT = 5;
const COMPOUND_LOXODROMIC_Q1 = 6;
const COMPOUND_LOXODROMIC_Q2 = 7;

CompoundLoxodromic.createFromJson = function(obj){
    return new CompoundLoxodromic(Sphere.createFromJson(obj['innerSphere']),
				                  Sphere.createFromJson(obj['outerSphere']),
				                  obj['point'].slice(0),
				                  obj['q1'].slice(0),
				                  obj['q2'].slice(0));
}

CompoundLoxodromic.prototype = {
    update: function(){
	    this.inverted = sphereInvert(this.inner, this.outer);
	    this.pInnerInv = sphereInvertOnPoint(this.p, this.inner);
	    this.pOuterInv = sphereInvertOnPoint(this.p, this.outer);
	    this.s3 = makeSphereFromPoints(this.p, this.pInnerInv, this.pOuterInv, this.q1);
	    this.s4 = makeSphereFromPoints(this.p, this.pInnerInv, this.pOuterInv, this.q2);

        this.controlPointRadius = 50;
    },
    clone: function(){
	    return new CompoundLoxodromic(this.inner.clone(), this.outer.clone(),
				                      this.p.slice(0),
				                      this.q1.slice(0),
				                      this.q2.slice(0));
    },
    exportJson: function(){
        return {"innerSphere": this.inner.exportJson(),
                "outerSphere": this.outer.exportJson(),
                "point": this.p,
                "q1": this.q1,
                "q2": this.q2};
    },
    getUniformArray: function(){
	    return this.inner.getUniformArray().concat(this.outer.getUniformArray(),
						                           this.inverted.getUniformArray(),
						                           this.s3.getUniformArray(),
						                           this.s4.getUniformArray(),
						                           this.p, [0],
						                           this.q1, [0],
						                           this.q2, [0]);
    },
    setUniformLocation: function(uniLocation, gl, program, id, index){
	    uniLocation.push(gl.getUniformLocation(program,
					                           'u_compoundLoxodromic'+ index));
    },
    setUniformValues: function(uniLocation, gl, uniIndex){
	    gl.uniform4fv(uniLocation[uniIndex++], this.getUniformArray());
	    return uniIndex;
    },
    getComponentFromId: function(componentId){
        if(componentId == COMPOUND_LOXODROMIC_INNER_SPHERE){
	        return this.inner;
	    }else if(componentId == COMPOUND_LOXODROMIC_OUTER_SPHERE){
	        return this.outer;
	    }else if(componentId == COMPOUND_LOXODROMIC_INVERTED_SPHERE){
	        return this.inverted;
	    }else if(componentId == COMPOUND_LOXODROMIC_POINT){
            return this.p;
        }else if(componentId == COMPOUND_LOXODROMIC_Q1){
            return this.q1;
        }else if(componentId == COMPOUND_LOXODROMIC_Q2){
            return this.q2;
        }
    },
    move: function(scene, componentId, selectedAxis, mouse, prevMouse, prevObject,
                   axisVecOnScreen, camera, canvasWidth, canvasHeight){
        switch(componentId){
        case COMPOUND_LOXODROMIC_INNER_SPHERE:
	        if(selectedAxis == AXIS_RADIUS){
		        //set radius
		        var spherePosOnScreen = calcPointOnScreen(prevObject.inner.getPosition(),
							                              camera, canvasWidth, canvasHeight);
		        var diffSphereAndPrevMouse = [spherePosOnScreen[0] - prevMouse[0],
				                              spherePosOnScreen[1] - prevMouse[1]];
		        var r = Math.sqrt(diffSphereAndPrevMouse[0] * diffSphereAndPrevMouse[0] +
				                  diffSphereAndPrevMouse[1] * diffSphereAndPrevMouse[1]);
		        var diffSphereAndMouse = [spherePosOnScreen[0] - mouse[0],
					                      spherePosOnScreen[1] - mouse[1]];
		        var distToMouse = Math.sqrt(diffSphereAndMouse[0] * diffSphereAndMouse[0] +
				                            diffSphereAndMouse[1] * diffSphereAndMouse[1]);
		        var d = distToMouse - r;

		        var scaleFactor = 3;
		        //TODO: calculate tangent sphere
		        var nr = prevObject.inner.r + d * scaleFactor;

		        var dist = vecLength(diff(this.outer.getPosition(),
					                      this.inner.getPosition()));
		        if(dist <= this.outer.r - nr){
		            this.inner.r = nr;
		        }
	        }else{
		        var dx = mouse[0] - prevMouse[0];
		        var dy = mouse[1] - prevMouse[1];
		        var v = axisVecOnScreen[selectedAxis];
		        var lengthOnAxis = v[0] * dx + v[1] * dy;
		        var np = calcCoordOnAxis(camera, canvasWidth, canvasHeight,
					                     selectedAxis, v, prevObject.inner.getPosition(),
					                     lengthOnAxis);
		        var d = vecLength(diff(this.outer.getPosition(), np));
		        if(d <= this.outer.r - this.inner.r){
		            this.inner.set(selectedAxis, np[selectedAxis]);
		        }
	        }
            break;
        case COMPOUND_LOXODROMIC_OUTER_SPHERE:
            this.outer.move(scene, componentId, selectedAxis,
			                mouse, prevMouse, prevObject.outer,
                            axisVecOnScreen, camera, canvasWidth, canvasHeight);
            // Keep spheres kissing along the z-axis
            if(selectedAxis == AXIS_RADIUS){
                this.inner.set(AXIS_Z, prevObject.inner.get(AXIS_Z) + this.outer.r - prevObject.outer.r);
            }else{
                var prevValue = prevObject.outer.get(selectedAxis);
                var d = prevObject.inner.get(selectedAxis) - prevValue;
                this.inner.set(selectedAxis, this.outer.get(selectedAxis) + d);

                var dp = prevObject.p[selectedAxis] - prevValue;
                this.p[selectedAxis] = this.outer.get(selectedAxis) + dp;

                var dq1 = prevObject.q1[selectedAxis] - prevValue;
                this.q1[selectedAxis] = this.outer.get(selectedAxis) + dq1;

                var dq2 = prevObject.q2[selectedAxis] - prevValue;
                this.q2[selectedAxis]  = this.outer.get(selectedAxis) + dq2;


            }
            break;
        case COMPOUND_LOXODROMIC_POINT:
        case COMPOUND_LOXODROMIC_Q1:
        case COMPOUND_LOXODROMIC_Q2:
            var prevPoint = prevObject.getComponentFromId(componentId);

            var dx = mouse[0] - prevMouse[0];
	        var dy = mouse[1] - prevMouse[1];
	        var v = axisVecOnScreen[selectedAxis];
	        var lengthOnAxis = v[0] * dx + v[1] * dy;
	        var np = calcCoordOnAxis(camera, canvasWidth, canvasHeight,
				                     selectedAxis, v, prevPoint,
				                     lengthOnAxis);
            this.getComponentFromId(componentId)[selectedAxis] = np[selectedAxis];
            break;
        }
        this.update();
    },
    castRay: function(objectId, index, eye, ray, isect){
        isect = intersectSphere(objectId, index, COMPOUND_LOXODROMIC_POINT,
                                this.p, this.controlPointRadius,
                                eye, ray, isect);
        isect = intersectSphere(objectId, index, COMPOUND_LOXODROMIC_Q1,
                                this.q1, this.controlPointRadius,
                                eye, ray, isect);
        isect = intersectSphere(objectId, index, COMPOUND_LOXODROMIC_Q2,
                                this.q2, this.controlPointRadius,
                                eye, ray, isect);
        isect = intersectOverlappingSphere(objectId, index,
                                           COMPOUND_LOXODROMIC_INNER_SPHERE,
                                           COMPOUND_LOXODROMIC_OUTER_SPHERE,
                                           this.inner, this.outer,
				                           eye, ray, isect);
        return isect;
    },
    calcAxisOnScreen: function(componentId, camera, width, height){
        switch(componentId){
        case COMPOUND_LOXODROMIC_POINT:
        case COMPOUND_LOXODROMIC_Q1:
        case COMPOUND_LOXODROMIC_Q2:
            return calcAxisOnScreen(this.getComponentFromId(componentId),
                                    camera, width, height);
            break;
        default:
            return calcAxisOnScreen(this.getComponentFromId(componentId).getPosition(),
                                    camera, width, height);
        }

    }
}


var ModCompoundLoxodromic = function(inner, outer, p, q1, q2){
    this.inner = inner;
    this.outer = outer;
    this.p = p;
    this.q1 = q1;
    this.q2 = q2;
    this.update();
}

const MOD_COMPOUND_LOXODROMIC_INNER_SPHERE = 0;
const MOD_COMPOUND_LOXODROMIC_OUTER_SPHERE = 1;
const MOD_COMPOUND_LOXODROMIC_INVERTED_SPHERE = 2;
const MOD_COMPOUND_LOXODROMIC_S3 = 3;
const MOD_COMPOUND_LOXODROMIC_S4 = 4;
const MOD_COMPOUND_LOXODROMIC_POINT = 5;
const MOD_COMPOUND_LOXODROMIC_Q1 = 6;
const MOD_COMPOUND_LOXODROMIC_Q2 = 7;

ModCompoundLoxodromic.createFromJson = function(obj){
    return new ModCompoundLoxodromic(Sphere.createFromJson(obj['innerSphere']),
				                  Sphere.createFromJson(obj['outerSphere']),
				                  obj['point'].slice(0),
				                  obj['q1'].slice(0),
				                  obj['q2'].slice(0));
}

ModCompoundLoxodromic.prototype = {
    update: function(){
	    this.inverted = sphereInvert(this.inner, this.outer);
	    this.pInnerInv = sphereInvertOnPoint(this.p, this.inner);
	    this.pOuterInv = sphereInvertOnPoint(this.p, this.outer);
	    this.s3 = makeSphereFromPoints(this.p, this.pInnerInv, this.pOuterInv, this.q1);
	    this.s4 = makeSphereFromPoints(this.p, this.pInnerInv, this.pOuterInv, this.q2);

        let lineDir = normalize3(diff(this.outer.getPosition(),
                                      this.inner.getPosition()));
        let lineP = this.inner.getPosition();
        let [p1, p2] = calcLineSphereIntersection(lineP, lineDir, this.s3);
        let [p3, p4] = calcLineSphereIntersection(lineP, lineDir, this.s4);

        if(vecLength(diff(p1, this.inverted.getPosition())) < this.inverted.r){
            this.innerFixedPoint = p1;
            this.outerFixedPoint = p2;
        }else{
            this.innerFixedPoint = p2;
            this.outerFixedPoint = p1;
        }
        this.sphereOnFixedPoint = new Sphere(this.outerFixedPoint[0],
                                             this.outerFixedPoint[1],
                                             this.outerFixedPoint[2],
                                             this.inner.r);
        this.concentricInner = sphereInvert(this.inner, this.sphereOnFixedPoint);
        this.concentricInverted = sphereInvert(this.inverted, this.sphereOnFixedPoint);
        this.scalingFactor = this.concentricInverted.r / this.concentricInner.r;

        let PI_4 = Math.PI / 4;
        let [s3Theta, s3Phi] = this.s3.getAngles(this.outerFixedPoint);
        this.invertedS3P1 = sphereInvertOnPoint(this.s3.getSurfacePoint(s3Theta + PI_4,
                                                                        s3Phi),
                                                this.s3);
        this.invertedS3P2 = sphereInvertOnPoint(this.s3.getSurfacePoint(s3Theta - PI_4,
                                                                        s3Phi),
                                                this.s3);
        this.invertedS3P3 = sphereInvertOnPoint(this.s3.getSurfacePoint(s3Theta + PI_4,
                                                                        s3Phi - PI_4),
                                                this.s3);
        this.planeS3V1 = diff(this.invertedS3P1, this.invertedS3P2);
        this.planeS3V2 = diff(this.invertedS3P3, this.invertedS3P2);
        this.planeS3N = normalize3(cross(this.planeS3V1, this.planeS3V2));

        let [s4Theta, s4Phi] = this.s4.getAngles(this.outerFixedPoint);
        this.invertedS4P1 = sphereInvertOnPoint(this.s4.getSurfacePoint(s4Theta + PI_4,
                                                                        s4Phi),
                                                this.s4);
        this.invertedS4P2 = sphereInvertOnPoint(this.s4.getSurfacePoint(s4Theta - PI_4,
                                                                        s4Phi),
                                                this.s4);
        this.invertedS4P3 = sphereInvertOnPoint(this.s4.getSurfacePoint(s4Theta,
                                                                        s4Phi + PI_4),
                                                this.s4);
        this.planeS4V1 = diff(this.invertedS4P1, this.invertedS4P2);
        this.planeS4V2 = diff(this.invertedS4P3, this.invertedS4P2);
        this.planeS4N = normalize3(cross(this.planeS4V1, this.planeS4V2));

        this.angleVec = diff(this.planeS3N, this.planeS4N);
        this.thetaRad = Math.PI - Math.atan2(-this.angleVec[2], -this.angleVec[0]) + Math.PI,
        this.phiRad = Math.PI - Math.acos(this.angleVec[1] / this.s4.r);
        console.log(degrees(this.thetaRad));
        console.log(degrees(this.phiRad));

        this.controlPointRadius = 50;
    },
    clone: function(){
	    return new ModCompoundLoxodromic(this.inner.clone(), this.outer.clone(),
				                         this.p.slice(0),
				                         this.q1.slice(0),
				                         this.q2.slice(0));
    },
    exportJson: function(){
        return {"innerSphere": this.inner.exportJson(),
                "outerSphere": this.outer.exportJson(),
                "point": this.p,
                "q1": this.q1,
                "q2": this.q2};
    },
    getUniformArray: function(){
	    return this.inner.getUniformArray().concat(this.outer.getUniformArray(),
						                           this.inverted.getUniformArray(),
						                           this.s3.getUniformArray(),
						                           this.s4.getUniformArray(),
						                           this.p, [0],
						                           this.q1, [0],
						                           this.q2, [0],
                                                   this.sphereOnFixedPoint.getUniformArray(),
                                                   this.concentricInner.getUniformArray(),
                                                   this.concentricInverted.getUniformArray(),
                                                   [this.scalingFactor, this.thetaRad, this.phiRad, 0]);
    },
    setUniformLocation: function(uniLocation, gl, program, id, index){
	    uniLocation.push(gl.getUniformLocation(program,
					                           'u_modCompoundLoxodromic'+ index));
    },
    setUniformValues: function(uniLocation, gl, uniIndex){
	    gl.uniform4fv(uniLocation[uniIndex++], this.getUniformArray());
	    return uniIndex;
    },
    getComponentFromId: function(componentId){
        if(componentId == MOD_COMPOUND_LOXODROMIC_INNER_SPHERE){
	        return this.inner;
	    }else if(componentId == MOD_COMPOUND_LOXODROMIC_OUTER_SPHERE){
	        return this.outer;
	    }else if(componentId == MOD_COMPOUND_LOXODROMIC_INVERTED_SPHERE){
	        return this.inverted;
	    }else if(componentId == MOD_COMPOUND_LOXODROMIC_POINT){
            return this.p;
        }else if(componentId == MOD_COMPOUND_LOXODROMIC_Q1){
            return this.q1;
        }else if(componentId == MOD_COMPOUND_LOXODROMIC_Q2){
            return this.q2;
        }
    },
    move: function(scene, componentId, selectedAxis, mouse, prevMouse, prevObject,
                   axisVecOnScreen, camera, canvasWidth, canvasHeight){
        switch(componentId){
        case MOD_COMPOUND_LOXODROMIC_INNER_SPHERE:
	        if(selectedAxis == AXIS_RADIUS){
		        //set radius
		        var spherePosOnScreen = calcPointOnScreen(prevObject.inner.getPosition(),
							                              camera, canvasWidth, canvasHeight);
		        var diffSphereAndPrevMouse = [spherePosOnScreen[0] - prevMouse[0],
				                              spherePosOnScreen[1] - prevMouse[1]];
		        var r = Math.sqrt(diffSphereAndPrevMouse[0] * diffSphereAndPrevMouse[0] +
				                  diffSphereAndPrevMouse[1] * diffSphereAndPrevMouse[1]);
		        var diffSphereAndMouse = [spherePosOnScreen[0] - mouse[0],
					                      spherePosOnScreen[1] - mouse[1]];
		        var distToMouse = Math.sqrt(diffSphereAndMouse[0] * diffSphereAndMouse[0] +
				                            diffSphereAndMouse[1] * diffSphereAndMouse[1]);
		        var d = distToMouse - r;

		        var scaleFactor = 3;
		        //TODO: calculate tangent sphere
		        var nr = prevObject.inner.r + d * scaleFactor;

		        var dist = vecLength(diff(this.outer.getPosition(),
					                      this.inner.getPosition()));
		        if(dist <= this.outer.r - nr){
		            this.inner.r = nr;
		        }
	        }else{
		        var dx = mouse[0] - prevMouse[0];
		        var dy = mouse[1] - prevMouse[1];
		        var v = axisVecOnScreen[selectedAxis];
		        var lengthOnAxis = v[0] * dx + v[1] * dy;
		        var np = calcCoordOnAxis(camera, canvasWidth, canvasHeight,
					                     selectedAxis, v, prevObject.inner.getPosition(),
					                     lengthOnAxis);
		        var d = vecLength(diff(this.outer.getPosition(), np));
		        if(d <= this.outer.r - this.inner.r){
		            this.inner.set(selectedAxis, np[selectedAxis]);
		        }
	        }
            break;
        case MOD_COMPOUND_LOXODROMIC_OUTER_SPHERE:
            this.outer.move(scene, componentId, selectedAxis,
			                mouse, prevMouse, prevObject.outer,
                            axisVecOnScreen, camera, canvasWidth, canvasHeight);
            // Keep spheres kissing along the z-axis
            if(selectedAxis == AXIS_RADIUS){
                this.inner.set(AXIS_Z, prevObject.inner.get(AXIS_Z) + this.outer.r - prevObject.outer.r);
            }else{
                var prevValue = prevObject.outer.get(selectedAxis);
                var d = prevObject.inner.get(selectedAxis) - prevValue;
                this.inner.set(selectedAxis, this.outer.get(selectedAxis) + d);

                var dp = prevObject.p[selectedAxis] - prevValue;
                this.p[selectedAxis] = this.outer.get(selectedAxis) + dp;

                var dq1 = prevObject.q1[selectedAxis] - prevValue;
                this.q1[selectedAxis] = this.outer.get(selectedAxis) + dq1;

                var dq2 = prevObject.q2[selectedAxis] - prevValue;
                this.q2[selectedAxis]  = this.outer.get(selectedAxis) + dq2;


            }
            break;
        case MOD_COMPOUND_LOXODROMIC_POINT:
        case MOD_COMPOUND_LOXODROMIC_Q1:
        case MOD_COMPOUND_LOXODROMIC_Q2:
            var prevPoint = prevObject.getComponentFromId(componentId);

            var dx = mouse[0] - prevMouse[0];
	        var dy = mouse[1] - prevMouse[1];
	        var v = axisVecOnScreen[selectedAxis];
	        var lengthOnAxis = v[0] * dx + v[1] * dy;
	        var np = calcCoordOnAxis(camera, canvasWidth, canvasHeight,
				                     selectedAxis, v, prevPoint,
				                     lengthOnAxis);
            this.getComponentFromId(componentId)[selectedAxis] = np[selectedAxis];
            break;
        }
        this.update();
    },
    castRay: function(objectId, index, eye, ray, isect){
        isect = intersectSphere(objectId, index, MOD_COMPOUND_LOXODROMIC_POINT,
                                this.p, this.controlPointRadius,
                                eye, ray, isect);
        isect = intersectSphere(objectId, index, MOD_COMPOUND_LOXODROMIC_Q1,
                                this.q1, this.controlPointRadius,
                                eye, ray, isect);
        isect = intersectSphere(objectId, index, MOD_COMPOUND_LOXODROMIC_Q2,
                                this.q2, this.controlPointRadius,
                                eye, ray, isect);
        isect = intersectOverlappingSphere(objectId, index,
                                           MOD_COMPOUND_LOXODROMIC_INNER_SPHERE,
                                           MOD_COMPOUND_LOXODROMIC_OUTER_SPHERE,
                                           this.inner, this.outer,
				                           eye, ray, isect);
        return isect;
    },
    calcAxisOnScreen: function(componentId, camera, width, height){
        switch(componentId){
        case MOD_COMPOUND_LOXODROMIC_POINT:
        case MOD_COMPOUND_LOXODROMIC_Q1:
        case MOD_COMPOUND_LOXODROMIC_Q2:
            return calcAxisOnScreen(this.getComponentFromId(componentId),
                                    camera, width, height);
            break;
        default:
            return calcAxisOnScreen(this.getComponentFromId(componentId).getPosition(),
                                    camera, width, height);
        }

    }
}


var Camera = function(target, fovDegree, eyeDist, up){
    this.target = target;
    this.prevTarget = target;
    this.fovDegree = fovDegree;
    this.eyeDist = eyeDist;
    this.up = up;
    this.theta = 0;
    this.phi = 0;
    this.position;
    this.update();
}

// Camera is on the sphere which its center is target and radius is eyeDist.
// Position is defined by two angle, theta and phi.
Camera.prototype = {
    update: function(){
	    this.position = [this.eyeDist * Math.cos(this.phi) * Math.cos(this.theta),
			             this.eyeDist * Math.sin(this.phi),
			             -this.eyeDist * Math.cos(this.phi) * Math.sin(this.theta)];
	    this.position = sum(this.target, this.position);
	    if(Math.abs(this.phi) % (2 * Math.PI) > Math.PI / 2. &&
	       Math.abs(this.phi) % (2 * Math.PI) < 3 * Math.PI / 2.){
	        this.up = [0, -1, 0];
	    }else{
	        this.up = [0, 1, 0];
	    }
    },
    getUniformArray: function(){
        return this.position.concat(this.target,
                                    this.up,
                                    [this.fovDegree, 0, 0]);
    }
}

const GENERATORS_NAME_ID_MAP = {
    "SchottkySpheres": ID_SCHOTTKY_SPHERE,
    "BaseSpheres": ID_BASE_SPHERE,
    "TransformByPlanes": ID_TRANSFORM_BY_PLANES,
    "TransformBySpheres": ID_TRANSFORM_BY_SPHERES,
    "CompoundParabolic": ID_COMPOUND_PARABOLIC,
    "CompoundLoxodromic": ID_COMPOUND_LOXODROMIC,
    "InfiniteSpheres": ID_INFINITE_SPHERE,
    "Parabolic": ID_PARABOLIC,
    "Loxodromic": ID_LOXODROMIC,
    "ModCompoundLoxodromic": ID_MOD_COMPOUND_LOXODROMIC
}

const GENERATORS_NAME_CLASS_MAP = {
    "SchottkySpheres": Sphere,
    "BaseSpheres": Sphere,
    "TransformByPlanes": TransformByPlanes,
    "TransformBySpheres": TransformBySpheres,
    "CompoundParabolic": CompoundParabolic,
    "CompoundLoxodromic": CompoundLoxodromic,
    "InfiniteSpheres": InfiniteSphere,
    "Parabolic": Parabolic,
    "Loxodromic": Loxodromic,
    "ModCompoundLoxodromic": ModCompoundLoxodromic
}


const GENERATORS_ID_NAME_MAP = {};
GENERATORS_ID_NAME_MAP[ID_SCHOTTKY_SPHERE] = "SchottkySpheres";
GENERATORS_ID_NAME_MAP[ID_BASE_SPHERE] = "BaseSpheres";
GENERATORS_ID_NAME_MAP[ID_TRANSFORM_BY_PLANES] = "TransformByPlanes";
GENERATORS_ID_NAME_MAP[ID_TRANSFORM_BY_SPHERES] = "TransformBySpheres";
GENERATORS_ID_NAME_MAP[ID_COMPOUND_PARABOLIC] = "CompoundParabolic";
GENERATORS_ID_NAME_MAP[ID_COMPOUND_LOXODROMIC] = "CompoundLoxodromic";
GENERATORS_ID_NAME_MAP[ID_INFINITE_SPHERE] = "InfiniteSpheres";
GENERATORS_ID_NAME_MAP[ID_PARABOLIC] = "Parabolic";
GENERATORS_ID_NAME_MAP[ID_LOXODROMIC] = "Loxodromic";
GENERATORS_ID_NAME_MAP[ID_MOD_COMPOUND_LOXODROMIC] = "ModCompoundLoxodromic";

var Scene = function(){
    this.objects = {};
    for(objectName in GENERATORS_NAME_ID_MAP){
        this.objects[GENERATORS_NAME_ID_MAP[objectName]] = [];
    }
}


Scene.prototype = {
    loadParameter: function(param){
        this.objects = {};
        for(objectName in GENERATORS_NAME_ID_MAP){
            this.objects[GENERATORS_NAME_ID_MAP[objectName]] =
                (param[objectName] == undefined) ? [] : this.clone(param[objectName]);
        }
    },
    loadParameterFromJson: function(param){
        this.objects = {};
        var generators = param['generators'];
        for(generatorName in GENERATORS_NAME_ID_MAP){
            this.objects[GENERATORS_NAME_ID_MAP[generatorName]] = [];
            var objects = generators[generatorName];
            if(objects == undefined) continue;
            for(var i = 0 ; i < objects.length ; i++){
                var obj = GENERATORS_NAME_CLASS_MAP[generatorName].createFromJson(generators[generatorName][i]);
                this.objects[GENERATORS_NAME_ID_MAP[generatorName]].push(obj);
            }
        }
    },
    setRenderContext: function(context){
        for(objectName in GENERATORS_NAME_ID_MAP){
            context['num'+ objectName] = this.objects[GENERATORS_NAME_ID_MAP[objectName]].length;
        }
    },
    clone: function(objects){
	    var obj = [];
	    for(var i = 0 ; i < objects.length ; i++){
	        obj.push(objects[i].clone());
	    }
	    return obj;
    },
    exportJson: function(){
        var json = {};
        json["name"] = "scene";
        var generators = {};
        for(objectId in Object.keys(this.objects)){
	        objectId = parseInt(objectId);
            var objs = [];
	        var objArray = this.objects[objectId];
            if(objArray.length == 0) continue;
	        for(var i = 0 ; i < objArray.length ; i++){
		        objs.push(objArray[i].exportJson());
	        }
            generators[GENERATORS_ID_NAME_MAP[objectId]] = objs;
	    }
        json["generators"] = generators;
        return json;
    },
    saveSceneAsJson: function(){
        var blob = new Blob([JSON.stringify(this.exportJson(), null, "    ")],
                            {type: "text/plain"});
        var a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = 'scene.json';
        a.click();
    },
    addSchottkySphere: function(schottkyCanvas, orbitCanvas){
	    this.objects[ID_SCHOTTKY_SPHERE].push(new Sphere(500, 500, 0, 300));
        window.clearTimeout(schottkyCanvas.renderTimerID);
        window.clearTimeout(orbitCanvas.renderTimerID);
	    updateShaders(this, schottkyCanvas, orbitCanvas);
    },
    addBaseSphere: function(schottkyCanvas, orbitCanvas){
	    this.objects[ID_BASE_SPHERE].push(new Sphere(500, 500, 0, 125));
        window.clearTimeout(schottkyCanvas.renderTimerID);
        window.clearTimeout(orbitCanvas.renderTimerID);
	    updateShaders(this, schottkyCanvas, orbitCanvas);
    },
    addInfiniteSphere: function(schottkyCanvas, orbitCanvas, pos){
        this.objects[ID_INFINITE_SPHERE].push(new InfiniteSphere(pos, 0, 0));
        window.clearTimeout(schottkyCanvas.renderTimerID);
        window.clearTimeout(orbitCanvas.renderTimerID);
	    updateShaders(this, schottkyCanvas, orbitCanvas);
    },
    addTranslation: function(schottkyCanvas, orbitCanvas, pos){
        this.objects[ID_TRANSFORM_BY_PLANES].push(new TransformByPlanes(300, -300, 0, 0, 0));
        window.clearTimeout(schottkyCanvas.renderTimerID);
        window.clearTimeout(orbitCanvas.renderTimerID);
	    updateShaders(this, schottkyCanvas, orbitCanvas);
    },
    addTransformBySpheres: function(schottkyCanvas, orbitCanvas, pos){
        this.objects[ID_TRANSFORM_BY_SPHERES].push(new TransformBySpheres(new Sphere(0, 665, 633, 500),
                                                                          new Sphere(0, 665, 472, 661)));
        window.clearTimeout(schottkyCanvas.renderTimerID);
        window.clearTimeout(orbitCanvas.renderTimerID);
	    updateShaders(this, schottkyCanvas, orbitCanvas);
    },
    addCompoundLoxodromic: function(schottkyCanvas, orbitCanvas, pos){
        this.objects[ID_COMPOUND_LOXODROMIC].push(new CompoundLoxodromic(new Sphere(10, 50, 900, 400),
                                                                         new Sphere(100, 100, 900, 700),
                                                                         [0, 1000, 100],
                                                                         [100, -1000, 100],
                                                                         [1000, 0, 90]));
        window.clearTimeout(schottkyCanvas.renderTimerID);
        window.clearTimeout(orbitCanvas.renderTimerID);
	    updateShaders(this, schottkyCanvas, orbitCanvas);
    },
    getSelectedObject: function(eye, ray){
        // [distance, objectId, index, componentId]
        var isect = [99999999, -1, -1, -1];
        for(objectId in Object.keys(this.objects)){
	        objectId = parseInt(objectId);
	        var objArray = this.objects[objectId];
	        for(var i = 0 ; i < objArray.length ; i++){
		        isect = objArray[i].castRay(objectId, i, eye, ray, isect);
	        }
	    }
        // return [objectId, index, componentId]
        return isect.slice(1, 4);
    },
    // axis 0:x 1:y 2:z 3:radius
    move: function(objId, index, componentId, selectedAxis, mouse, prevMouse, prevObject,
                   axisVecOnScreen, camera, canvasWidth, canvasHeight){
        if(objId == -1) return;
	    var obj = this.objects[objId][index];
	    if(obj != undefined){
	        obj.move(this, componentId, selectedAxis, mouse, prevMouse, prevObject,
                     axisVecOnScreen, camera, canvasWidth, canvasHeight);
        }
    },
    remove: function(objectId, objectIndex){
        if(objectId == -1) return;
        var objArray = this.objects[objectId];
        var obj = objArray[objectIndex];
        if(objArray != undefined &&
           objArray.length != 0 ){
            objArray.splice(objectIndex, 1);
        }

    },
    setUniformLocation: function(uniLocation, gl, program){
	    for(objectId in Object.keys(this.objects)){
	        objectId = parseInt(objectId);
	        var objArray = this.objects[objectId];
            if(objArray.length == 0) continue;
	        for(var i = 0 ; i < objArray.length ; i++){
		        objArray[i].setUniformLocation(uniLocation, gl, program,
					                           objectId, i);
	        }
	    }
	    return uniLocation;
    },
    setUniformValues: function(uniLocation, gl, uniIndex){
	    for(objectId in Object.keys(this.objects)){
	        objectId = parseInt(objectId);
	        var objArray = this.objects[objectId];
            if(objArray.length == 0) continue;
	        for(var i = 0 ; i < objArray.length ; i++){
		        uniIndex = objArray[i].setUniformValues(uniLocation, gl, uniIndex);
	        }
	    }

	    return uniIndex;
    },
}

import * as THREE from 'three';
import { gsap } from 'gsap';

export class ZoomController {
    constructor(camera, scene, controls, renderer) {
        this.camera = camera;
        this.scene = scene;
        this.controls = controls;
        this.renderer = renderer;
        this.zoomedTarget = null;
        this.originalState = null;
        this.originalZoomedTargetPosition = null;
        this.titleDisplayElement = document.getElementById('block-title-display');
        this.isZooming = false; // Tracks if a zoom animation is in progress
    }

    isZoomed() {
        return !!this.zoomedTarget;
    }

    isTransitioning() {
        return this.isZooming;
    }

    toggleZoom(targetObject, interactableObjects, otherOpacityValue) {
        if (!interactableObjects) {
            console.error("[zoomController] toggleZoom called without interactableObjects!");
            return;
        }

        if (this.zoomedTarget && this.zoomedTarget === targetObject) {
            this.zoomOut(interactableObjects);
        } else if (targetObject) {
            this.zoomIn(targetObject, interactableObjects, otherOpacityValue);
        } else if (this.zoomedTarget) {
            this.zoomOut(interactableObjects);
        }
    }

    zoomIn(targetObject, interactableObjects, otherOpacityValue) {
        console.log('[zoomController] zoomIn called. Target:', targetObject, 'Other Opacity:', otherOpacityValue);
        this.isZooming = true;
        if (!targetObject || !targetObject.geometry || !targetObject.geometry.parameters) {
            console.error('[zoomController] Invalid targetObject for zoomIn:', targetObject);
            if (this.titleDisplayElement) this.titleDisplayElement.textContent = '';
            return;
        }

        if (this.zoomedTarget && this.zoomedTarget !== targetObject && this.originalZoomedTargetPosition) {
            const oldTarget = this.zoomedTarget;
            oldTarget.userData.isZoomElevated = false; 
            console.log(`[zoomController] zoomIn: Switching. Old target ${oldTarget.uuid} isZoomElevated SET TO FALSE.`);
            gsap.killTweensOf(oldTarget.position, "y");
            gsap.to(oldTarget.position, {
                y: this.originalZoomedTargetPosition.y,
                duration: 0.3,
                ease: 'power2.out'
            });
        }
        
        this.zoomedTarget = targetObject;
        this.zoomedTarget.userData.isZoomElevated = true; 
        console.log(`[zoomController] zoomIn: New target ${this.zoomedTarget.uuid} isZoomElevated SET TO TRUE.`);
        gsap.killTweensOf(this.zoomedTarget.position, "y");
        this.originalZoomedTargetPosition = this.zoomedTarget.position.clone();

        if (this.titleDisplayElement && targetObject.userData) {
            this.titleDisplayElement.textContent = targetObject.userData.title || 'Construction en cours...';
        } else if (this.titleDisplayElement) {
            this.titleDisplayElement.textContent = 'Construction en cours...';
        }

        if (!this.originalState) {
            this.originalState = {
                position: this.camera.position.clone(),
                rotation: this.camera.rotation.clone(),
                quaternion: this.camera.quaternion.clone(),
                target: this.controls.target.clone(),
                cameraDirectionToTarget: new THREE.Vector3().subVectors(this.camera.position, this.controls.target).normalize()
            };
        }

        this.controls.enabled = false;

        interactableObjects.forEach(obj => {
            const isTarget = obj === this.zoomedTarget;
            this.renderer.setBlockFocusStyle(obj, isTarget);

            if (isTarget) {
                obj.material.forEach(mat => {
                    mat.opacity = 1.0;
                    mat.transparent = false;
                    mat.depthWrite = true;
                    mat.needsUpdate = true;
                });
            } else {
                obj.userData.isZoomElevated = false;
                gsap.killTweensOf(obj.position, "y");
                gsap.to(obj.position, { y: obj.userData.originalY, duration: 0.3, ease: 'power2.out' });

                obj.material.forEach(mat => {
                    mat.transparent = true;
                    mat.depthWrite = true;
                    mat.opacity = otherOpacityValue;
                    mat.needsUpdate = true;
                });
            }
        });

        if (this.zoomedTarget && Array.isArray(this.zoomedTarget.material)) {
            this.zoomedTarget.material.forEach(mat => {
                mat.opacity = 1.0;
                mat.transparent = false;
                mat.depthWrite = true;
                mat.needsUpdate = true;
            });
        }

        const targetPosition = new THREE.Vector3();
        targetObject.getWorldPosition(targetPosition);
        console.log('[zoomController] Target world position (cube center):', targetPosition.x, targetPosition.y, targetPosition.z);

        const cubeWidth = targetObject.geometry.parameters.width;
        const focusedBlockHeight = targetObject.userData.originalScaleY;
        console.log('[zoomController] Target cube dimensions (W x H from userData.originalScaleY):', cubeWidth, 'x', focusedBlockHeight);

        // Get max block height from renderer
        const maxGridBlockHeight = this.renderer.getMaxCalculatedBlockHeight();
        console.log('[zoomController] Max grid block height from renderer:', maxGridBlockHeight);

        // Calculate target Y for the top surface of the focused block
        const targetTopSurfaceY = maxGridBlockHeight * 1.5;

        // Calculate the new center Y position for the focused block
        const elevatedYPosition = targetTopSurfaceY - (focusedBlockHeight / 2);
        console.log(`[zoomController] Calculated elevatedYPosition: ${elevatedYPosition} (targetTopSurfaceY: ${targetTopSurfaceY}, focusedBlockHeight: ${focusedBlockHeight})`);

        gsap.to(targetObject.position, {
            y: elevatedYPosition,
            duration: 0.8,
            ease: 'power3.inOut'
        });

        const elevatedTargetCenter = targetPosition.clone();
        elevatedTargetCenter.y = elevatedYPosition;

        const desiredDistance = cubeWidth * 3.0; // how far camera should be from center horizontally

        // Determine edge-based direction to position camera outside the grid
        let cameraPosition;
        const gridSize = this.renderer.gridSize || 0;
        if (typeof targetObject.userData.rowIndex === 'number' && typeof targetObject.userData.colIndex === 'number' && gridSize > 0) {
            const dirVec = new THREE.Vector3();
            if (targetObject.userData.rowIndex === 0) dirVec.z -= 1;            // North edge, place camera north
            if (targetObject.userData.rowIndex === gridSize - 1) dirVec.z += 1; // South edge, place camera south
            if (targetObject.userData.colIndex === 0) dirVec.x -= 1;            // West edge, place camera west
            if (targetObject.userData.colIndex === gridSize - 1) dirVec.x += 1; // East edge, place camera east

            if (dirVec.length() > 0) {
                dirVec.normalize();
                cameraPosition = new THREE.Vector3().copy(elevatedTargetCenter).addScaledVector(dirVec, desiredDistance);
                cameraPosition.y = elevatedTargetCenter.y + focusedBlockHeight * 1.2; // ensure above block
            }
        }

        if (!cameraPosition) {
            // Fallback to previous logic based on current view direction
            const camToTargetVec = new THREE.Vector3().subVectors(this.camera.position, this.controls.target);
            const horizontalLen = Math.sqrt(camToTargetVec.x * camToTargetVec.x + camToTargetVec.z * camToTargetVec.z);
            const totalLen = camToTargetVec.length();
            const isTopDown = (horizontalLen / (totalLen || 1)) < 0.25; // threshold: <25% of distance is horizontal

            if (isTopDown) {
                // We were looking straight down, create a pleasant diagonal angle
                const diagonalOffset = new THREE.Vector3(1, 0, 1).normalize().multiplyScalar(desiredDistance);
                cameraPosition = new THREE.Vector3().copy(elevatedTargetCenter).add(diagonalOffset);
                cameraPosition.y = elevatedTargetCenter.y + focusedBlockHeight * 1.2; // slightly above
            } else {
                // Preserve current horizontal direction but move to proper distance focusing new block
                const dir = camToTargetVec.normalize();
                cameraPosition = new THREE.Vector3().copy(elevatedTargetCenter).addScaledVector(dir, desiredDistance);
                cameraPosition.y = Math.max(cameraPosition.y, elevatedTargetCenter.y + focusedBlockHeight * 1.2);
            }
        }

        console.log('[zoomController] Calculated camera position for zoomIn:', cameraPosition.x, cameraPosition.y, cameraPosition.z);

        gsap.to(this.camera.position, {
            x: cameraPosition.x,
            y: cameraPosition.y,
            z: cameraPosition.z,
            duration: 0.8,
            ease: 'power3.inOut',
            onUpdate: () => {
                this.camera.lookAt(elevatedTargetCenter);
            }
        });

        gsap.to(this.controls.target, {
            x: elevatedTargetCenter.x,
            y: elevatedTargetCenter.y,
            z: elevatedTargetCenter.z,
            duration: 0.8,
            ease: 'power3.inOut',
            onComplete: () => {
                this.controls.enabled = true;
                this.controls.enableRotate = true;
                this.controls.enableZoom = true;
                this.controls.update();
                this.isZooming = false;
            }
        });
    }

    zoomOut(interactableObjects) {
        console.log('[zoomController] zoomOut CALLED. Current zoomedTarget:', this.zoomedTarget ? this.zoomedTarget.uuid : 'null');
        this.isZooming = true;
        
        if (this.titleDisplayElement) {
            this.titleDisplayElement.textContent = '';
        }

        if (this.zoomedTarget && this.originalZoomedTargetPosition) {
            this.zoomedTarget.userData.isZoomElevated = false; 
            console.log(`[zoomController] zoomOut: Target ${this.zoomedTarget.uuid} isZoomElevated SET TO FALSE.`);
            gsap.to(this.zoomedTarget.position, {
                y: this.originalZoomedTargetPosition.y,
                duration: 0.8,
                ease: 'power3.inOut',
                onComplete: () => {
                    this.originalZoomedTargetPosition = null;
                }
            });
        } else {
            console.warn("[zoomController] zoomOut called but no originalZoomedTargetPosition or no zoomedTarget");
        }
        
        console.log('[zoomController] zoomOut: Proceeding with full zoom-out animation and material restoration.');
        interactableObjects.forEach(obj => {
            this.renderer.setBlockFocusStyle(obj, false);
            obj.material.forEach(mat => {
                mat.opacity = 1.0;
                mat.transparent = false;
                mat.depthWrite = true;
                mat.needsUpdate = true;
            });
        });

        this.controls.enabled = false;

        gsap.to(this.camera.position, {
            x: this.originalState.position.x,
            y: this.originalState.position.y,
            z: this.originalState.position.z,
            duration: 0.8,
            ease: 'power3.inOut',
            onUpdate: () => {}
        });

        gsap.to(this.controls.target, {
            x: this.originalState.target.x,
            y: this.originalState.target.y,
            z: this.originalState.target.z,
            duration: 0.8,
            ease: 'power3.inOut',
            onComplete: () => {
                console.log('[zoomController] zoomOut GSAP onComplete FIRED.');
                const originalTarget = this.originalState.target.clone();
                this.camera.lookAt(originalTarget);
                this.controls.target.copy(originalTarget);
                this.controls.enableRotate = true;
                this.controls.enableZoom = true;
                this.controls.enabled = true;

                this.controls.update();
                this.originalState = null; 
                this.zoomedTarget = null;
                this.isZooming = false; 
            }
        });
    }
} 
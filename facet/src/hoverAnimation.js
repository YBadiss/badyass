import * as THREE from 'three';
import { gsap } from 'gsap'; // Re-introduce GSAP

let raycaster = new THREE.Raycaster();
let mouse = new THREE.Vector2();

const HOVER_LIFT_AMOUNT = 0.3; // Define lift amount

let lastHoveredObject = null;
let cameraRef, canvasRef, rendererRef, zoomControllerRef;

function onMouseMove(event) {
    if (!canvasRef || !cameraRef) return;
    const rect = canvasRef.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
}

function handleHover(interactableObjects) {
    if (!cameraRef || !rendererRef || interactableObjects.length === 0) return;

    // If a zoom/unzoom transition is in progress, skip hover logic
    if (zoomControllerRef && zoomControllerRef.isTransitioning()) {
        // console.log('[hoverAnimation] Zoom transitioning, skipping hover.');
        return;
    }

    raycaster.setFromCamera(mouse, cameraRef);
    const intersects = raycaster.intersectObjects(interactableObjects);

    let newlyIntersectedObject = null;
    if (intersects.length > 0) {
        newlyIntersectedObject = intersects[0].object;
    }

    if (newlyIntersectedObject === lastHoveredObject) return;

    if (lastHoveredObject) {
        const isLastHoveredZoomed = zoomControllerRef && zoomControllerRef.isZoomed() && lastHoveredObject === zoomControllerRef.zoomedTarget;
        if (!isLastHoveredZoomed) {
            rendererRef.setBlockHoverStyle(lastHoveredObject, false);
            gsap.to(lastHoveredObject.position, {
                y: lastHoveredObject.userData.originalY,
                duration: 0.2,
                ease: 'power2.out'
            });
        }
    }

    if (newlyIntersectedObject) {
        const isNewlyHoveredZoomed = zoomControllerRef && zoomControllerRef.isZoomed() && newlyIntersectedObject === zoomControllerRef.zoomedTarget;
        if (!isNewlyHoveredZoomed) {
            rendererRef.setBlockHoverStyle(newlyIntersectedObject, true);
            gsap.to(newlyIntersectedObject.position, {
                y: newlyIntersectedObject.userData.originalY + HOVER_LIFT_AMOUNT,
                duration: 0.2,
                ease: 'power2.out'
            });
        }
    }

    lastHoveredObject = newlyIntersectedObject;
}

function onMouseLeaveCanvas() {
    if (lastHoveredObject && rendererRef) {
        const isLastHoveredZoomed = zoomControllerRef && zoomControllerRef.isZoomed() && lastHoveredObject === zoomControllerRef.zoomedTarget;
        if (!isLastHoveredZoomed) {
            rendererRef.setBlockHoverStyle(lastHoveredObject, false);
            gsap.to(lastHoveredObject.position, {
                y: lastHoveredObject.userData.originalY,
                duration: 0.2,
                ease: 'power2.out'
            });
        }
        lastHoveredObject = null;
    }
}

// Debounce function (can be kept if preferred for performance)
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

let debouncedHandleHover;

// Renderer is now passed as an argument
export function initHoverAnimation(interactableObjects, camera, canvas, inZoomController, inRenderer) {
    cameraRef = camera;
    canvasRef = canvas;
    zoomControllerRef = inZoomController;
    rendererRef = inRenderer; // Store renderer reference

    if (debouncedHandleHover) {
        canvasRef.removeEventListener('mousemove', debouncedHandleHover);
        canvasRef.removeEventListener('mouseleave', onMouseLeaveCanvas); // Ensure old mouseleave is removed too
    }

    debouncedHandleHover = debounce(() => handleHover(interactableObjects), 5); 

    canvasRef.addEventListener('mousemove', onMouseMove, false);
    canvasRef.addEventListener('mousemove', debouncedHandleHover, false);
    canvasRef.addEventListener('mouseleave', onMouseLeaveCanvas, false); // Add mouseleave listener for canvas
}

export function clearHoverEffects() {
    if (lastHoveredObject && rendererRef) {
        const isLastHoveredZoomed = zoomControllerRef && zoomControllerRef.isZoomed() && lastHoveredObject === zoomControllerRef.zoomedTarget;
        if (!isLastHoveredZoomed) {
             rendererRef.setBlockHoverStyle(lastHoveredObject, false);
             // Ensure position is also reset if clearHoverEffects is called mid-hover
             gsap.to(lastHoveredObject.position, { 
                y: lastHoveredObject.userData.originalY, 
                duration: 0.1, // Quicker reset
                ease: 'power2.out' 
            });
        }
        lastHoveredObject = null;
    }
    // Clean up event listeners if canvasRef exists
    if (canvasRef) {
        if (onMouseMove) canvasRef.removeEventListener('mousemove', onMouseMove);
        if (debouncedHandleHover) canvasRef.removeEventListener('mousemove', debouncedHandleHover);
        if (onMouseLeaveCanvas) canvasRef.removeEventListener('mouseleave', onMouseLeaveCanvas);
    }
    // Optionally nullify refs if needed, though they get reassigned in init
    // cameraRef = null; canvasRef = null; rendererRef = null; zoomControllerRef = null;
} 
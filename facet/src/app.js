import '../styles/style.css';
import { Renderer } from './renderer.js';
import { splitImage } from './tileSplitter.js';
import { initHoverAnimation } from './hoverAnimation.js';
import { ZoomController } from './zoomController.js';
import { Raycaster } from 'three'; // Import Raycaster
import gridConfig from '../assets/config.json'; // Import JSON configuration
import imageSrc from '../assets/noam.jpeg'; // Import image

document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM Content Loaded'); // Log DOMContentLoaded
    const resetViewButton = document.getElementById('resetView');
    const canvasContainer = document.getElementById('canvasContainer');
    const otherOpacitySlider = document.getElementById('otherOpacity'); // Get the slider

    let renderer, zoomController;
    let mouseDownPos = null; // To store mouse down position
    const CLICK_THRESHOLD = 5; // Max pixels mouse can move to be considered a click

    // Define handleClick in a scope accessible by the single event listener
    function handleClick(event) {
        if (!renderer || !zoomController) {
            console.warn("[app.js] handleClick: renderer or zoomController not ready");
            return;
        }

        const interactableObjects = renderer.getInteractableObjects(); 
        if (!interactableObjects || interactableObjects.length === 0) {
            // console.warn("[app.js] handleClick: No interactable objects"); // Can be noisy if no objects yet
            return;
        }

        const currentOpacity = parseFloat(otherOpacitySlider.value); // Get current value from slider

        const rect = canvasContainer.getBoundingClientRect();
        const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

        const raycaster = new Raycaster();
        raycaster.setFromCamera({ x, y }, renderer.camera);
        const intersects = raycaster.intersectObjects(interactableObjects, true);

        if (intersects.length > 0) {
            const clickedObject = intersects[0].object;
            zoomController.toggleZoom(clickedObject, interactableObjects, currentOpacity);
        }
    }

    // Attach the event listener ONCE after DOM is loaded
    if (canvasContainer) {
        canvasContainer.addEventListener('mousedown', (event) => {
            mouseDownPos = { x: event.clientX, y: event.clientY };
        }, false);

        canvasContainer.addEventListener('mouseup', (event) => {
            if (mouseDownPos) {
                const deltaX = event.clientX - mouseDownPos.x;
                const deltaY = event.clientY - mouseDownPos.y;
                const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

                if (distance < CLICK_THRESHOLD) {
                    handleClick(event); // Call handleClick only if it's a click
                }
            }
            mouseDownPos = null; // Reset on mouse up
        }, false);

    } else {
        console.error("CRITICAL: canvasContainer not found on DOMContentLoaded!");
    }

    // initApp is now called from loadConfigAndInitialize, which handles the image loading asynchronously
    function initApp(config, image) { // config is now the imported gridConfig
        console.log('initApp called with config:', config, 'and image:', image, 'width:', image.width, 'height:', image.height);
        if (renderer) {
            renderer.dispose();
        }
        renderer = new Renderer(canvasContainer);
        zoomController = new ZoomController(renderer.camera, renderer.scene, renderer.controls, renderer);

        const gridSizeParts = config.gridSize.split('x').map(Number);
        const gridRows = gridSizeParts[0];

        splitImage(image, gridRows, (tiles) => {
            console.log('[app.js] splitImage callback executed. Tiles count:', tiles.length, 'First tile:', tiles[0]);
            if (!renderer) {
                console.error('[app.js] CRITICAL: renderer is not initialized in splitImage callback!');
                return;
            }
            renderer.renderTiles(tiles, image, gridRows, config.blocks);
            initHoverAnimation(renderer.getInteractableObjects(), renderer.camera, canvasContainer, zoomController, renderer);
        });
    }

    resetViewButton.addEventListener('click', () => {
        console.log('[app.js] Reset View button CLICKED.');
        if (renderer) {
            console.log('[app.js] Reset View: Renderer exists. Calling renderer.resetCamera().');
            renderer.resetCamera(); 
            if (zoomController) {
                console.log('[app.js] Reset View: ZoomController exists. Is zoomed?', zoomController.isZoomed());
                if (zoomController.isZoomed()) {
                    const interactableObjects = renderer.getInteractableObjects();
                    const currentOpacity = parseFloat(otherOpacitySlider.value);
                    console.log('[app.js] Reset View: Currently zoomed. Calling zoomController.toggleZoom(null) with opacity:', currentOpacity);
                    zoomController.toggleZoom(null, interactableObjects, currentOpacity);
                } else {
                    console.log('[app.js] Reset View: Not currently zoomed. (No toggleZoom call)');
                }
            } else {
                console.log('[app.js] Reset View: ZoomController does NOT exist.');
            }
        } else {
            console.log('[app.js] Reset View: Renderer does NOT exist.');
        }
    });

    // This function handles the asynchronous image loading part.
    function loadAndInitImage() {
        console.log('loadAndInitImage called with config:', gridConfig);
        if (gridConfig && imageSrc) {
            const img = new Image();
            img.crossOrigin = "Anonymous";
            img.onload = () => {
                console.log('Image loaded from config path:', img.src, 'Dimensions:', img.width, 'x', img.height);
                initApp(gridConfig, img); // Pass imported config and loaded image
            };
            img.onerror = (err) => {
                alert('Failed to load image specified in configuration. Check console for details.');
            };
            img.src = imageSrc;
        } else if (gridConfig) {
            console.error('imagePath not found in configuration.', gridConfig);
            alert('Configuration loaded, but imagePath is missing.');
        } else {
            console.error('gridConfig is not available. Check import and file path.');
            alert('Failed to load grid configuration.');
        }
    }

    // Load image and initialize based on the imported config.json
    loadAndInitImage();
}); 
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

const GLOBAL_HEIGHT_MULTIPLIER = 0.75;

export class Renderer {
    constructor(container) {
        console.log('Renderer constructor called with container:', container);
        this.container = container;
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 1000);
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.interactableObjects = [];
        this.currentImage = null;
        this.gridSize = 0;
        this.maxCalculatedBlockHeight = 0;

        this.init();
    }

    init() {
        console.log('[renderer.js] Renderer init called');
        console.log('[renderer.js] Initial container dimensions (W x H):', this.container.clientWidth, 'x', this.container.clientHeight);
        this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.container.appendChild(this.renderer.domElement);

        // Lights
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
        this.scene.add(ambientLight);
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(5, 10, 7.5);
        this.scene.add(directionalLight);

        this.camera.position.set(0, 0, 10);
        this.controls.enableDamping = true;

        window.addEventListener('resize', () => this.onWindowResize(), false);
        this.animate();
    }

    onWindowResize() {
        this.camera.aspect = this.container.clientWidth / this.container.clientHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    }

    renderTiles(tiles, image, gridSize, blocksConfig) {
        console.log('Renderer renderTiles called. Tiles:', tiles, 'Image:', image, 'GridSize:', gridSize, 'BlocksConfig:', blocksConfig);
        this.clearScene();
        this.currentImage = image;
        this.gridSize = gridSize;
        const CUBE_SIZE = 1;
        const spacing = 0.1; // Spacing between cubes
        const totalGridWidth = gridSize * CUBE_SIZE + (gridSize -1) * spacing;
        const totalGridHeight = gridSize * CUBE_SIZE + (gridSize -1) * spacing;

        const tileTexturePairs = this.createTileTextures(image, gridSize);

        for (let i = 0; i < tiles.length; i++) {
            const tile = tiles[i];
            const blockConfig = blocksConfig[i];

            if (!blockConfig) {
                console.warn(`[renderer.js] Missing blockConfig for tile index ${i}`);
                continue;
            }

            const row = Math.floor(i / gridSize);
            const col = i % gridSize;

            const sideColor = new THREE.Color(blockConfig.color || 0xEEEEEE);
            const graySideColor = new THREE.Color(0x666666);

            const actualBlockHeight = blockConfig.height * GLOBAL_HEIGHT_MULTIPLIER;

            const geometry = new THREE.BoxGeometry(CUBE_SIZE, actualBlockHeight, CUBE_SIZE);
            
            // Default to grayscale texture for the top material
            const topMaterial = new THREE.MeshStandardMaterial({ map: tileTexturePairs[i].grayTexture, color: 0xffffff });
            topMaterial.polygonOffset = true;
            topMaterial.polygonOffsetFactor = 1;
            topMaterial.polygonOffsetUnits = 1;

            const sideMaterialProperties = {
                color: graySideColor, // use gray by default
                polygonOffset: true,
                polygonOffsetFactor: 1,
                polygonOffsetUnits: 1
            };
            
            const textureLoader = new THREE.TextureLoader();
            const defaultSideMaterial = new THREE.MeshStandardMaterial(sideMaterialProperties);
            const bottomMaterial = new THREE.MeshStandardMaterial({ ...sideMaterialProperties, color: graySideColor.clone().multiplyScalar(0.8) });

            // Helper to create a solid-colored side material
            const createSolidSideMaterial = (col) => new THREE.MeshStandardMaterial({
                color: col,
                polygonOffset: true,
                polygonOffsetFactor: 1,
                polygonOffsetUnits: 1
            });

            const materials = [
                defaultSideMaterial, // right (EAST)
                defaultSideMaterial, // left (WEST)
                topMaterial, // top
                bottomMaterial, // bottom
                defaultSideMaterial, // front (SOUTH)
                defaultSideMaterial  // back (NORTH)
            ];

            // Store composite texture info for later focus/hover updates
            const sideCompositeInfo = {}; // key = materials array index (0..5) => { materialRef, colorTex, grayTex }

            // Utility to create composite textures (background + image)
            const createCompositeTextures = (img, colorHexStr, grayHexStr) => {
                const w = img.width;
                const h = img.height;

                // Create a grayscaled version of the input image
                const grayScaleImageCanvas = document.createElement('canvas');
                grayScaleImageCanvas.width = w;
                grayScaleImageCanvas.height = h;
                const grayCtx = grayScaleImageCanvas.getContext('2d', { willReadFrequently: true });
                grayCtx.drawImage(img, 0, 0, w, h);
                const imageData = grayCtx.getImageData(0, 0, w, h);
                const data = imageData.data;
                for (let j = 0; j < data.length; j += 4) {
                    const grayVal = 0.299 * data[j] + 0.587 * data[j+1] + 0.114 * data[j+2];
                    data[j] = grayVal;     // Red
                    data[j+1] = grayVal; // Green
                    data[j+2] = grayVal; // Blue
                    // Alpha (data[j+3]) remains unchanged
                }
                grayCtx.putImageData(imageData, 0, 0); // Put the grayscaled image back onto this canvas

                const makeTex = (bgHex, sourceImage) => { // sourceImage will be img (HTMLImageElement) or grayScaleImageCanvas (HTMLCanvasElement)
                    const canvas = document.createElement('canvas');
                    canvas.width = w;
                    canvas.height = h;
                    const ctx = canvas.getContext('2d');
                    ctx.fillStyle = bgHex;
                    ctx.fillRect(0, 0, w, h);
                    ctx.drawImage(sourceImage, 0, 0, w, h); // Draw the (original or grayscaled) image
                    return new THREE.CanvasTexture(canvas);
                };
                return {
                    colorTex: makeTex(colorHexStr, img), // Use original image for colorTex
                    grayTex: makeTex(grayHexStr, grayScaleImageCanvas) // Use grayscaled canvas for grayTex
                };
            };

            if (blockConfig.sides) {
                // Order: NORTH, EAST, SOUTH, WEST
                const sideToMaterialIndex = [5, 0, 4, 1];
                blockConfig.sides.forEach((sidePath, sideIdx) => {
                    if (!sidePath) return; // skip nulls

                    const matIndex = sideToMaterialIndex[sideIdx];
                    // Placeholder material until image loads
                    const placeholderMat = createSolidSideMaterial(graySideColor);
                    materials[matIndex] = placeholderMat;

                    textureLoader.load(
                        sidePath,
                        (imgTex) => {
                            const imgElement = imgTex.image;
                            const bgHex = `#${sideColor.getHexString()}`;
                            const grayBgHex = `#${graySideColor.getHexString()}`;
                            const { colorTex, grayTex } = createCompositeTextures(imgElement, bgHex, grayBgHex);

                            // Create the initial material (unfocused = gray)
                            const sideMat = new THREE.MeshStandardMaterial({ map: grayTex, transparent: false });
                            materials[matIndex] = sideMat;
                            sideCompositeInfo[matIndex] = { materialRef: sideMat, colorTex, grayTex };
                        },
                        undefined,
                        (err) => {
                            console.warn(`[renderer.js] Failed to load texture: ${sidePath}`, err);
                        }
                    );
                });
            }

            const cube = new THREE.Mesh(geometry, materials);

            cube.position.x = (col * (CUBE_SIZE + spacing)) - totalGridWidth / 2 + CUBE_SIZE / 2;
            cube.position.y = actualBlockHeight / 2; // Adjust y based on actual height
            cube.position.z = (row * (CUBE_SIZE + spacing)) - totalGridHeight / 2 + CUBE_SIZE / 2; 

            cube.userData = {
                id: blockConfig.id || i,
                originalY: cube.position.y, // This is the initial center Y position
                originalScaleY: actualBlockHeight, // This is the actual height of the cube
                title: blockConfig.title || "Construction en cours...", // Store title or default
                isZoomElevated: false,
                colorTexture: tileTexturePairs[i].colorTexture,
                grayTexture: tileTexturePairs[i].grayTexture,
                topMaterialRef: topMaterial,
                sideColor: sideColor,
                graySideColor: graySideColor,
                sideCompositeInfo: sideCompositeInfo,
                rowIndex: row,
                colIndex: col
            };

            this.scene.add(cube);
            this.interactableObjects.push(cube);
        }
        console.log('Renderer renderTiles: interactableObjects count:', this.interactableObjects.length);
        this.resetCamera();
    }
    
    setBlockFocusStyle(block, isFocused) {
        if (!block.userData || !block.userData.topMaterialRef || !block.userData.colorTexture || !block.userData.grayTexture) {
            console.warn("[Renderer.setBlockFocusStyle] Block missing necessary userData properties:", block.uuid, block.userData);
            return;
        }

        // 1. Update top texture
        const newTexture = isFocused ? block.userData.colorTexture : block.userData.grayTexture;
        if (block.userData.topMaterialRef.map !== newTexture) {
            block.userData.topMaterialRef.map = newTexture;
            if (block.userData.topMaterialRef.map) {
                 block.userData.topMaterialRef.map.needsUpdate = true;
            }
            block.userData.topMaterialRef.needsUpdate = true; 
        }

        // 2. Update side materials colors (indices 0,1,3,4,5)
        const targetSideColor = isFocused ? block.userData.sideColor : block.userData.graySideColor;
        block.material.forEach((mat, idx) => {
            if (mat === block.userData.topMaterialRef) return; // skip top
            // If this material is part of sideCompositeInfo, we'll handle via texture swap
            if (block.userData.sideCompositeInfo && block.userData.sideCompositeInfo[idx]) {
                return; // avoid tinting composite textured sides
            }
            if (!mat.color.equals(targetSideColor)) {
                mat.color.copy(targetSideColor);
                mat.needsUpdate = true;
            }
        });

        // 3. Swap composite textures for sides with images
        if (block.userData.sideCompositeInfo) {
            Object.values(block.userData.sideCompositeInfo).forEach(info => {
                const desiredTex = isFocused ? info.colorTex : info.grayTex;
                if (info.materialRef.map !== desiredTex) {
                    info.materialRef.map = desiredTex;
                    info.materialRef.needsUpdate = true;
                }
            });
        }
    }

    setBlockHoverStyle(block, isHovered) {
        if (!block.userData || !block.userData.topMaterialRef || !block.userData.colorTexture || !block.userData.grayTexture) {
            console.warn("[Renderer.setBlockHoverStyle] Block missing necessary userData properties:", block.uuid, block.userData);
            return;
        }

        // 1. Update top texture
        const newTopTexture = isHovered ? block.userData.colorTexture : block.userData.grayTexture;
        if (block.userData.topMaterialRef.map !== newTopTexture) {
            block.userData.topMaterialRef.map = newTopTexture;
            if (block.userData.topMaterialRef.map) {
                 block.userData.topMaterialRef.map.needsUpdate = true;
            }
            block.userData.topMaterialRef.needsUpdate = true; 
        }

        // 2. Update side composite textures (if they exist)
        // This is called when a block is hovered/unhovered AND is NOT the currently focused/zoomed block.
        if (block.userData.sideCompositeInfo) {
            Object.values(block.userData.sideCompositeInfo).forEach(info => {
                // When hovered (and not focused), use colorTex (original image colors + sideColor BG).
                // When not hovered (and not focused), use grayTex (grayscaled image + graySideColor BG).
                const desiredSideTex = isHovered ? info.colorTex : info.grayTex;
                if (info.materialRef.map !== desiredSideTex) {
                    info.materialRef.map = desiredSideTex;
                    info.materialRef.needsUpdate = true;
                }
            });
        }
    }

    createTileTextures(image, gridSize) {
        const texturePairs = [];
        const tileWidth = image.width / gridSize;
        const tileHeight = image.height / gridSize;
        // tempCanvas and ctx will be created inside the loop

        for (let r = 0; r < gridSize; r++) {
            for (let c = 0; c < gridSize; c++) {
                const tileCanvas = document.createElement('canvas'); // Create a NEW canvas for each tile
                tileCanvas.width = Math.max(1, Math.floor(tileWidth)); // Ensure at least 1px, use Math.floor for integer
                tileCanvas.height = Math.max(1, Math.floor(tileHeight)); // Ensure at least 1px, use Math.floor for integer
                const ctx = tileCanvas.getContext('2d', { willReadFrequently: true });

                // Clamp source width/height to avoid going out of bounds if image isn't perfectly divisible
                const sWidth = Math.floor(tileWidth);
                const sHeight = Math.floor(tileHeight);
                const sx = c * sWidth;
                const sy = r * sHeight;

                // Check if the source crop is outside the image dimensions
                if (sx + sWidth > image.width || sy + sHeight > image.height) {
                    // This tile is partially or fully outside the source image bounds due to non-perfect division
                    // Fill with a fallback color or skip, here just drawing what's available or potentially blank
                    console.warn(`Tile [${r},${c}] source area is partially outside image. sx:${sx}, sy:${sy}, sWidth:${sWidth}, sHeight:${sHeight}, imageW:${image.width}, imageH:${image.height}`);
                    // To avoid errors, we can draw a small part or clearRect, or adjust sWidth/sHeight to fit
                    // For now, let drawImage handle it, it might draw partial or nothing if sx,sy are too large.
                }

                ctx.clearRect(0, 0, tileCanvas.width, tileCanvas.height);
                ctx.drawImage(image,
                              sx, sy,       // source x, y
                              sWidth, sHeight, // source width, height
                              0, 0,                                 // destination x, y
                              tileCanvas.width, tileCanvas.height); // destination width, height
                
                const colorTexture = new THREE.CanvasTexture(tileCanvas);

                // Create Grayscale Version
                const imageData = ctx.getImageData(0, 0, tileCanvas.width, tileCanvas.height);
                const grayImageData = new ImageData(new Uint8ClampedArray(imageData.data), imageData.width, imageData.height);
                const data = grayImageData.data;
                for (let j = 0; j < data.length; j += 4) {
                    const gray = 0.299 * data[j] + 0.587 * data[j+1] + 0.114 * data[j+2];
                    data[j] = gray;     // Red
                    data[j+1] = gray; // Green
                    data[j+2] = gray; // Blue
                }
                const grayTileCanvas = document.createElement('canvas');
                grayTileCanvas.width = tileCanvas.width;
                grayTileCanvas.height = tileCanvas.height;
                grayTileCanvas.getContext('2d').putImageData(grayImageData, 0, 0);
                const grayTexture = new THREE.CanvasTexture(grayTileCanvas);

                texturePairs.push({ colorTexture: colorTexture, grayTexture: grayTexture });
            }
        }
        return texturePairs;
    }


    clearScene() {
        console.log('Renderer clearScene called. Number of objects to clear:', this.interactableObjects.length);
        this.interactableObjects.forEach(obj => {
            if (obj.geometry) obj.geometry.dispose();
            
            // Dispose stored textures in userData
            if (obj.userData && obj.userData.colorTexture) obj.userData.colorTexture.dispose();
            if (obj.userData && obj.userData.grayTexture) obj.userData.grayTexture.dispose();

            if (obj.material) {
                if (Array.isArray(obj.material)) {
                    obj.material.forEach(mat => {
                        if (mat.map) mat.map.dispose();
                        mat.dispose();
                    });
                } else {
                    if (obj.material.map) obj.material.map.dispose();
                    obj.material.dispose();
                }
            }
            this.scene.remove(obj);
        });
        this.interactableObjects = [];
    }

    resetCamera() {
        console.log('Renderer resetCamera called.');
        let maxBlockHeight = 0;

        if (this.interactableObjects.length > 0) {
            this.interactableObjects.forEach(obj => {
                if (obj.userData && typeof obj.userData.originalScaleY === 'number') {
                    if (obj.userData.originalScaleY > maxBlockHeight) {
                        maxBlockHeight = obj.userData.originalScaleY;
                    }
                }
            });
        } else {
            // Fallback if there are no blocks, use a default or grid-based height
            const CUBE_SIZE = 1;
            const spacing = 0.1;
            const totalGridSpan = this.gridSize * CUBE_SIZE + (this.gridSize > 0 ? (this.gridSize - 1) * spacing : 0);
            maxBlockHeight = totalGridSpan * 0.5; // Arbitrary fallback, could be a fixed value too
            console.log('[resetCamera] No interactable objects, using fallback height based on grid span for maxBlockHeight approx:', maxBlockHeight);
        }

        this.maxCalculatedBlockHeight = maxBlockHeight;

        const cameraYPosition = this.maxCalculatedBlockHeight + (1 * this.gridSize);
        console.log(`[resetCamera] Max block height: ${this.maxCalculatedBlockHeight}, Camera Y position set to: ${cameraYPosition}`);

        // Set camera to look straight down from above the center of the grid
        this.camera.position.set(0, cameraYPosition, 0);
        this.camera.lookAt(0, 0, 0); // Look at the center of the grid (which is on the XZ plane)
        this.controls.target.set(0, 0, 0);
        
        this.controls.update();
    }

    getInteractableObjects() {
        return this.interactableObjects;
    }

    getMaxCalculatedBlockHeight() {
        return this.maxCalculatedBlockHeight;
    }

    getCurrentImage() {
        return this.currentImage;
    }

    animate() {
        requestAnimationFrame(this.animate.bind(this));
        this.controls.update();
        this.renderer.render(this.scene, this.camera);
    }

    dispose() {
        console.log('Renderer dispose called');
        window.removeEventListener('resize', this.onWindowResize);
        this.clearScene();
        if (this.renderer.domElement.parentElement) {
            this.container.removeChild(this.renderer.domElement);
        }
        this.renderer.dispose();
        this.controls.dispose();
    }
} 
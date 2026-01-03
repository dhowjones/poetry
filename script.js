const fridge = document.getElementById('refrigerator-area');
const poolBottom = document.getElementById('word-pool-bottom');
const poolLeft = document.getElementById('word-pool-left');
const poolRight = document.getElementById('word-pool-right');

// Collect ALL three word pools for word distribution (desktop)
// Mobile will only use poolBottom
const allPools = [poolBottom, poolLeft, poolRight].filter(pool => pool !== null); 
const refreshButton = document.getElementById('refresh-button');
const ROW_HEIGHT = 35; 

let draggedElement = null; // Used by both desktop drag and mobile touch drag
let tapTimer = null;       // Used for mobile quick-tap detection
let originalPool = null;   // Used to track tile's original pool for return logic

// --- CORE FUNCTIONS ---

function parseWords(csvText) {
    const lines = csvText.split(/[\r\n]+/).filter(line => line.trim() !== '');
    const dataLines = lines.slice(1);
    let allWords = [];

    dataLines.forEach(line => {
        const cells = line.split(','); 
        cells.forEach(cell => {
            let word = cell.trim();
            if (word.startsWith('"') && word.endsWith('"')) {
                word = word.substring(1, word.length - 1);
            }
            if (word.length > 0) {
                allWords.push(word);
            }
        });
    });
    
    console.log(`Successfully loaded ${allWords.length} words from CSV.`);
    return allWords;
}

async function loadWordsAndCreateTiles() {
    try {
        const response = await fetch('Borderline Poetry - Individual words.csv'); 
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status} - File not found. Check the CSV file path and name.`);
        }
        const csvText = await response.text();
        const finalWords = parseWords(csvText);
        createTiles(finalWords);
    } catch (error) {
        console.error("Could not load the word list:", error);
        if (poolBottom) {
             poolBottom.innerHTML = '<span style="color: red;">Error loading word list. Check console for details.</span>';
        }
    }
}

// Tiles ---
function createTiles(wordsArray) {
    if (allPools.length === 0) {
        console.error("No word pool containers found. Check index.html IDs.");
        return; 
    }
    
    // Check for touch device
    const isTouchDevice = ('ontouchstart' in window || navigator.maxTouchPoints > 0);
    
    wordsArray.sort(() => Math.random() - 0.5).forEach((word, index) => {
        const tile = document.createElement('div');
        tile.classList.add('word-tile');
        tile.textContent = word;
        
        tile.setAttribute('draggable', true);
        
        // Conditional Distribution:
        if (isTouchDevice) {
            // MOBILE: ALL words go ONLY to the bottom pool
            poolBottom.appendChild(tile);
        } else {
            // DESKTOP: Distribute words across all three pools
            allPools[index % allPools.length].appendChild(tile);
        }
    });
}

// Clear and Shuffle ---
function clearAndShuffle() {
    const allTiles = document.querySelectorAll('.word-tile');
    
    allTiles.forEach(tile => {
        // Reset tile positioning/scaling regardless of which pool it will end up in
        tile.style.position = '';
        tile.style.left = '';
        tile.style.top = '';
        tile.style.transform = '';
    });
    
    if (fridge && !fridge.querySelector('.poem-prompt')) {
        const prompt = document.createElement('p');
        prompt.classList.add('poem-prompt');
        prompt.textContent = "Drag words here to begin your poem...";
        fridge.appendChild(prompt);
    }
    
    // Check for touch device
    const isTouchDevice = ('ontouchstart' in window || navigator.maxTouchPoints > 0);
    
    if (allPools.length > 0) {
        const shuffledWords = Array.from(allTiles).sort(() => Math.random() - 0.5);
        
        shuffledWords.forEach((tile, index) => {
            if (isTouchDevice) {
                // MOBILE: ALL words go ONLY to the bottom pool
                poolBottom.appendChild(tile);
            } else {
                // DESKTOP: Redistribute across all three pools
                allPools[index % allPools.length].appendChild(tile);
            }
        });
    }
}

if (refreshButton) {
    refreshButton.addEventListener('click', clearAndShuffle);
}

// -----------------------------------------------------------------------
// --- HELPER FUNCTIONS FOR MOBILE LOGIC (RANDOM PLACEMENT) ---
// -----------------------------------------------------------------------

function getRandomFridgePosition(tile) {
    const fridgeRect = fridge.getBoundingClientRect();
    const tileWidth = tile.offsetWidth * 1.05; // Use scaled width
    
    // 1. Calculate random X position within bounds
    const maxX = fridgeRect.width - tileWidth;
    const randomX = Math.random() * maxX;
    const finalLeft = Math.max(0, randomX); 

    // 2. Calculate random Y position snapped to a row
    const maxRows = Math.floor(fridgeRect.height / ROW_HEIGHT);
    const randomRow = Math.floor(Math.random() * maxRows);
    const finalTop = randomRow * ROW_HEIGHT;
    
    return { left: finalLeft, top: finalTop };
}

function applyFridgeStyles(tile, position) {
    const prompt = fridge.querySelector('.poem-prompt');
    if (prompt) { prompt.remove(); }

    fridge.appendChild(tile);
    tile.style.position = 'absolute';
    tile.style.left = position.left + 'px';
    tile.style.top = position.top + 'px';
    tile.style.transform = 'scale(1.05)'; 
}

function applyPoolStyles(tile) {
    poolBottom.appendChild(tile); 
    tile.style.position = '';
    tile.style.left = '';
    tile.style.top = '';
    tile.style.transform = '';
}

// -----------------------------------------------------------------------
// --- DESKTOP MOUSE DRAG/DROP LISTENERS ---
// -----------------------------------------------------------------------

// DRAGSTART (Desktop)
document.addEventListener('dragstart', (e) => {
    if (e.target.classList.contains('word-tile')) {
        draggedElement = e.target;
        e.dataTransfer.setData('text/plain', e.target.textContent);
    }
});

if (fridge) {
    // DROP ON FRIDGE (Desktop)
    fridge.addEventListener('dragover', (e) => { e.preventDefault(); });

    fridge.addEventListener('drop', (e) => {
        e.preventDefault();
        
        if (draggedElement && draggedElement.classList.contains('word-tile')) {
            const rect = fridge.getBoundingClientRect();
            const rawLeft = e.clientX - rect.left - (draggedElement.offsetWidth / 2);
            const rawTop = e.clientY - rect.top - (draggedElement.offsetHeight / 2);
            
            const snappedTop = Math.round(rawTop / ROW_HEIGHT) * ROW_HEIGHT;
            const finalTop = Math.max(0, snappedTop); 
            
            applyFridgeStyles(draggedElement, { left: rawLeft, top: finalTop });
            draggedElement = null; 
        }
    });
}

// DROP ON ANY POOL (Desktop)
allPools.forEach(pool => {
    pool.addEventListener('dragover', (e) => { e.preventDefault(); });

    pool.addEventListener('drop', (e) => {
        e.preventDefault();
        
        if (draggedElement && draggedElement.classList.contains('word-tile')) {
            applyPoolStyles(draggedElement);
            draggedElement = null;
        }
    });
});

// -----------------------------------------------------------------------
// --- MOBILE TOUCH LISTENERS (ONLY on touch devices) ---
// -----------------------------------------------------------------------

if ('ontouchstart' in window || navigator.maxTouchPoints) {
    
    // --- TOUCH START (Handles both Tap-to-Move and Drag-to-Refine) ---
    document.addEventListener('touchstart', (e) => {
        const tile = e.target;
        if (!tile.classList.contains('word-tile')) return;

        e.preventDefault(); // Prevents default browser actions (like scrolling/zooming)

        // 1. Initial setup for the tile
        draggedElement = tile;
        originalPool = tile.parentElement;

        // 2. Start the tap timer and highlight (for quick tap)
        tile.classList.add('selected-tile');
        tapTimer = setTimeout(() => {
            // This runs if the press is LONGER than 300ms (initiates Drag-to-Refine)
            tile.classList.remove('selected-tile'); // Remove highlight for drag
            initiateMobileDrag(e); // Start the drag refinement process
        }, 300); 

        // 3. Set up listeners to detect if the tap becomes a drag
        document.addEventListener('touchmove', handleTouchMove);
        document.addEventListener('touchend', handleTouchEnd);
    }, { passive: false });


    // --- TOUCH MOVE (Only used for Drag-to-Refine inside the fridge) ---
    function handleTouchMove(e) {
        if (!tapTimer && draggedElement && originalPool === fridge) {
            // This only runs if it's a drag (tapTimer was cleared) AND the tile is in the fridge
            const touch = e.touches[0];
            const fridgeRect = fridge.getBoundingClientRect();
            
            // Calculate new position relative to the fridge
            const rawLeft = touch.clientX - fridgeRect.left - (draggedElement.offsetWidth * 1.05 / 2);
            const rawTop = touch.clientY - fridgeRect.top - (draggedElement.offsetHeight * 1.05 / 2);
            
            // Apply Snap-to-Row only for the Y-axis
            const snappedTop = Math.round(rawTop / ROW_HEIGHT) * ROW_HEIGHT;
            const finalTop = Math.max(0, snappedTop); 
            
            // Update position
            draggedElement.style.left = rawLeft + 'px';
            draggedElement.style.top = finalTop + 'px';
        } 
        
        // CRITICAL: If tapTimer is still running, clear it (it was a drag, not a tap)
        if (tapTimer) {
            clearTimeout(tapTimer);
            tapTimer = null;
            draggedElement.classList.remove('selected-tile'); // Remove highlight
        }
    }


    // --- TOUCH END (Handles Tap-to-Move/Return and ends Drag-to-Refine) ---
    function handleTouchEnd(e) {
        // 1. Clean up listeners
        document.removeEventListener('touchmove', handleTouchMove);
        document.removeEventListener('touchend', handleTouchEnd);

        // 2. Check for Quick Tap (Tap-to-Move/Return)
        if (tapTimer) {
            clearTimeout(tapTimer);
            
            if (originalPool !== fridge) {
                // Tap-to-Move: From Pool to Fridge (Random Placement)
                const position = getRandomFridgePosition(draggedElement);
                applyFridgeStyles(draggedElement, position);
            } else {
                // Tap-to-Return: From Fridge to Bottom Pool
                applyPoolStyles(draggedElement);
            }
        }
        
        // 3. General Cleanup
        if (draggedElement) {
            draggedElement.classList.remove('selected-tile');
            draggedElement = null; 
            originalPool = null;
        }
        tapTimer = null;
    }

    
    // --- DRAG REFINEMENT SETUP ---
    function initiateMobileDrag(e) {
        // This only runs on long press, AND ONLY if the tile is in the fridge.
        if (originalPool === fridge) {
            // Set tile to fixed position for seamless finger-following
            draggedElement.style.position = 'absolute';
            draggedElement.style.transform = 'scale(1.05)'; 
            draggedElement.style.zIndex = '100'; 
        } else {
            // If the long press started in the pool, treat it as a failed drag and end it.
            draggedElement = null;
            originalPool = null;
        }
    }
}


// ----------------------------------------------------
// START APPLICATION
// ----------------------------------------------------
loadWordsAndCreateTiles();

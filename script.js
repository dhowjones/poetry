const fridge = document.getElementById('refrigerator-area');
const poolBottom = document.getElementById('word-pool-bottom');
const poolLeft = document.getElementById('word-pool-left');
const poolRight = document.getElementById('word-pool-right');

const allPools = [poolBottom, poolLeft, poolRight].filter(pool => pool !== null); 
const refreshButton = document.getElementById('refresh-button');
const ROW_HEIGHT = 35; 

let draggedElement = null; 
let tapTimer = null;       
let originalPool = null;   

const isTouchDevice = ('ontouchstart' in window || navigator.maxTouchPoints > 0);

// Helper for the dynamic text prompt
function getPromptText() {
    return isTouchDevice 
        ? "Unlock your inner poet. Tap the words below to begin your poem."
        : "Unlock your inner poet. Drag words here to begin your poem.";
}

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
            if (word.length > 0) { allWords.push(word); }
        });
    });
    return allWords;
}

async function loadWordsAndCreateTiles() {
    const prompt = fridge.querySelector('.poem-prompt');
    if (prompt) prompt.textContent = getPromptText();

    try {
        const response = await fetch('Borderline Poetry - Individual words.csv'); 
        if (!response.ok) throw new Error(`File not found.`);
        const csvText = await response.text();
        const finalWords = parseWords(csvText);
        createTiles(finalWords);
    } catch (error) {
        console.error(error);
        if (poolBottom) poolBottom.innerHTML = '<span style="color: red;">Error loading words.</span>';
    }
}

function createTiles(wordsArray) {
    wordsArray.sort(() => Math.random() - 0.5).forEach((word, index) => {
        const tile = document.createElement('div');
        tile.classList.add('word-tile');
        tile.textContent = word;
        tile.setAttribute('draggable', true);
        
        if (isTouchDevice) {
            poolBottom.appendChild(tile);
        } else {
            allPools[index % allPools.length].appendChild(tile);
        }
    });
}

function clearAndShuffle() {
    const allTiles = document.querySelectorAll('.word-tile');
    allTiles.forEach(tile => {
        tile.style.position = '';
        tile.style.left = '';
        tile.style.top = '';
        tile.style.transform = '';
    });
    
    if (fridge) {
        let prompt = fridge.querySelector('.poem-prompt');
        if (!prompt) {
            prompt = document.createElement('p');
            prompt.classList.add('poem-prompt');
            fridge.appendChild(prompt);
        }
        prompt.textContent = getPromptText();
    }
    
    const shuffledWords = Array.from(allTiles).sort(() => Math.random() - 0.5);
    shuffledWords.forEach((tile, index) => {
        if (isTouchDevice) {
            poolBottom.appendChild(tile);
        } else {
            allPools[index % allPools.length].appendChild(tile);
        }
    });
}

if (refreshButton) refreshButton.addEventListener('click', clearAndShuffle);

// --- HELPER FUNCTIONS ---
function getRandomFridgePosition(tile) {
    const fridgeRect = fridge.getBoundingClientRect();
    const maxX = fridgeRect.width - (tile.offsetWidth * 1.05);
    const maxRows = Math.floor(fridgeRect.height / ROW_HEIGHT);
    return { 
        left: Math.max(0, Math.random() * maxX), 
        top: Math.floor(Math.random() * maxRows) * ROW_HEIGHT 
    };
}

function applyFridgeStyles(tile, position) {
    const prompt = fridge.querySelector('.poem-prompt');
    if (prompt) { prompt.textContent = ""; } 
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

// --- DESKTOP LISTENERS ---
document.addEventListener('dragstart', (e) => {
    if (e.target.classList.contains('word-tile')) { draggedElement = e.target; }
});

if (fridge) {
    fridge.addEventListener('dragover', (e) => e.preventDefault());
    fridge.addEventListener('drop', (e) => {
        e.preventDefault();
        if (draggedElement) {
            const rect = fridge.getBoundingClientRect();
            const rawTop = e.clientY - rect.top - (draggedElement.offsetHeight / 2);
            const snappedTop = Math.max(0, Math.round(rawTop / ROW_HEIGHT) * ROW_HEIGHT);
            applyFridgeStyles(draggedElement, { 
                left: e.clientX - rect.left - (draggedElement.offsetWidth / 2), 
                top: snappedTop 
            });
            draggedElement = null; 
        }
    });
}

// --- MOBILE TOUCH LISTENERS ---
if (isTouchDevice) {
    document.addEventListener('touchstart', (e) => {
        const tile = e.target;
        if (!tile.classList.contains('word-tile')) return;

        draggedElement = tile;
        originalPool = tile.parentElement;

        if (originalPool === fridge) {
            // Start moving fridge items immediately
            initiateMobileDrag(e);
        } else {
            // Words in pool: Wait to see if it's a tap or a scroll
            tile.classList.add('selected-tile');
            tapTimer = setTimeout(() => {
                tile.classList.remove('selected-tile');
                initiateMobileDrag(e);
            }, 250); 
        }
    }, { passive: false }); 

    function handleTouchMove(e) {
        if (draggedElement) {
            // STOP THE SCROLL
            e.preventDefault(); 
            
            const touch = e.touches[0];
            const fridgeRect = fridge.getBoundingClientRect();
            
            const rawLeft = touch.clientX - fridgeRect.left - (draggedElement.offsetWidth * 1.05 / 2);
            const rawTop = touch.clientY - fridgeRect.top - (draggedElement.offsetHeight * 1.05 / 2);
            
            draggedElement.style.position = 'absolute';
            draggedElement.style.left = rawLeft + 'px';
            draggedElement.style.top = Math.max(0, Math.round(rawTop / ROW_HEIGHT) * ROW_HEIGHT) + 'px';
            
            if (tapTimer) {
                clearTimeout(tapTimer);
                tapTimer = null;
            }
        }
    }

    function handleTouchEnd(e) {
        document.removeEventListener('touchmove', handleTouchMove);
        document.removeEventListener('touchend', handleTouchEnd);

        if (tapTimer) {
            clearTimeout(tapTimer);
            if (originalPool !== fridge) {
                applyFridgeStyles(draggedElement, getRandomFridgePosition(draggedElement));
            } else {
                applyPoolStyles(draggedElement);
            }
        }
        
        if (draggedElement) {
            draggedElement.classList.remove('selected-tile');
            draggedElement.style.transform = originalPool === fridge ? 'scale(1.05)' : '';
            draggedElement = null; 
        }
        tapTimer = null;
    }

    function initiateMobileDrag(e) {
        document.addEventListener('touchmove', handleTouchMove, { passive: false });
        document.addEventListener('touchend', handleTouchEnd);
        if (draggedElement) {
            draggedElement.style.zIndex = '1000';
            draggedElement.style.transform = 'scale(1.1)'; 
        }
    }
}

loadWordsAndCreateTiles();

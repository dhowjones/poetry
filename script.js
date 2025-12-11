const fridge = document.getElementById('refrigerator-area');
const poolBottom = document.getElementById('word-pool-bottom');
const poolLeft = document.getElementById('word-pool-left');
const poolRight = document.getElementById('word-pool-right');
// allPools should only contain elements that were successfully found
const allPools = [poolBottom, poolLeft, poolRight].filter(pool => pool !== null); 
const refreshButton = document.getElementById('refresh-button');
const ROW_HEIGHT = 30; 
let draggedElement = null;

// Function to convert CSV text into an array of words (ROBUST PARSER FIX)
function parseWords(csvText) {
    // 1. CRITICAL FIX: Use regex to split lines, handling all line endings (\r\n, \r, \n)
    const lines = csvText.split(/[\r\n]+/).filter(line => line.trim() !== '');
    
    // The first line is the header row; subsequent lines are data
    const dataLines = lines.slice(1);
    
    let allWords = [];

    dataLines.forEach(line => {
        const cells = line.split(','); 
        
        cells.forEach(cell => {
            let word = cell.trim();

            // 2. CRITICAL FIX: Remove potential surrounding quotation marks
            if (word.startsWith('"') && word.endsWith('"')) {
                word = word.substring(1, word.length - 1);
            }
            
            // Only add the word if it is not an empty string
            if (word.length > 0) {
                allWords.push(word);
            }
        });
    });
    
    // Optional: Log the final word count to the browser console to confirm
    console.log(`Successfully loaded ${allWords.length} words from CSV.`);
    
    return allWords;
}

// Function to fetch the CSV file and start the page setup
async function loadWordsAndCreateTiles() {
    try {
        const response = await fetch('Borderline Poetry - Individual words.csv'); 
        
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status} - File not found.`);
        }
        
        const csvText = await response.text();
        const finalWords = parseWords(csvText);
        
        createTiles(finalWords);

    } catch (error) {
        console.error("Could not load the word list:", error);
        // Fallback message, placed in the bottom pool (assuming it loaded)
        if (poolBottom) {
             poolBottom.innerHTML = 'Error loading word list. Check console for details.';
        }
    }
}

// Function to create the HTML tiles and distribute them across pools
function createTiles(wordsArray) {
    if (allPools.length === 0) {
        console.error("No word pool containers found. Check index.html IDs.");
        return; 
    }
    
    wordsArray.sort(() => Math.random() - 0.5).forEach((word, index) => {
        const tile = document.createElement('div');
        tile.classList.add('word-tile');
        tile.textContent = word;
        
        tile.setAttribute('draggable', true);
        
        // Distribute words across the three pools for the surrounding effect
        // Use modulo operator to cycle through the available pools
        allPools[index % allPools.length].appendChild(tile);
    });
}


// --- REFRESH BUTTON LOGIC ---
function clearAndShuffle() {
    const allTiles = document.querySelectorAll('.word-tile');
    
    // 1. Move all tiles back to the main (bottom) pool and clear styling
    allTiles.forEach(tile => {
        if (poolBottom) {
            poolBottom.appendChild(tile); // Move the tile to the bottom pool
        }
        
        // Reset all inline styling (position, rotation)
        tile.style.position = '';
        tile.style.left = '';
        tile.style.top = '';
        tile.style.transform = '';
    });
    
    // 2. Clear the poem prompt if it was removed
    if (fridge && !fridge.querySelector('.poem-prompt')) {
        const prompt = document.createElement('p');
        prompt.classList.add('poem-prompt');
        prompt.textContent = "Drag words here to begin your poem...";
        fridge.appendChild(prompt);
    }
    
    // 3. Shuffle the words in the word pool and redistribute
    if (allPools.length > 0) {
        const shuffledWords = Array.from(allTiles).sort(() => Math.random() - 0.5);
        
        shuffledWords.forEach((tile, index) => {
            // Redistribute across the three pools
            allPools[index % allPools.length].appendChild(tile);
        });
    }
}

// Add event listener to the refresh button
if (refreshButton) {
    refreshButton.addEventListener('click', clearAndShuffle);
}


// --- DRAGSTART EVENT (on the word tile) ---
document.addEventListener('dragstart', (e) => {
    if (e.target.classList.contains('word-tile')) {
        draggedElement = e.target;
        e.dataTransfer.setData('text/plain', e.target.textContent);
    }
});

// --- DRAG OVER EVENT (on the fridge area) ---
fridge.addEventListener('dragover', (e) => {
    e.preventDefault(); 
});

// --- DROP EVENT (on the fridge area - Snap-to-Row Logic) ---
fridge.addEventListener('drop', (e) => {
    e.preventDefault();
    
    if (draggedElement && draggedElement.classList.contains('word-tile')) {
        const prompt = fridge.querySelector('.poem-prompt');
        if (prompt) { prompt.remove(); }
        
        fridge.appendChild(draggedElement);
        
        // 1. Set the position
        draggedElement.style.position = 'absolute';
        
        const rect = fridge.getBoundingClientRect();
        
        // Calculate raw drop coordinates relative to the fridge
        const rawLeft = e.clientX - rect.left - (draggedElement.offsetWidth / 2);
        const rawTop = e.clientY - rect.top - (draggedElement.offsetHeight / 2);

        // 2. Snap to Row Logic
        const snappedTop = Math.round(rawTop / ROW_HEIGHT) * ROW_HEIGHT;
        const finalTop = Math.max(0, snappedTop); 
        
        // 3. Apply Positioning (horizontal freedom, vertical snap)
        draggedElement.style.left = rawLeft + 'px';
        draggedElement.style.top = finalTop + 'px'; 
        draggedElement.style.transform = 'none'; // Ensure no rotation
        
        draggedElement = null; 
    }
});

// --- DROP EVENT (on the word pools - to return a word) ---
// Loop through all pool containers to attach listeners
allPools.forEach(pool => {
    if (pool) { // Check if the pool element exists (from HTML)
        pool.addEventListener('dragover', (e) => {
            e.preventDefault(); 
        });

        pool.addEventListener('drop', (e) => {
            e.preventDefault();
            
            if (draggedElement && draggedElement.classList.contains('word-tile')) {
                // Return the word to the specific pool it was dropped on
                pool.appendChild(draggedElement); 
                
                // Clear all inline styling (position and rotation)
                draggedElement.style.position = '';
                draggedElement.style.left = '';
                draggedElement.style.top = '';
                draggedElement.style.transform = '';

                draggedElement = null;
            }
        });
    }
});


// ----------------------------------------------------
// START APPLICATION
// ----------------------------------------------------
loadWordsAndCreateTiles();

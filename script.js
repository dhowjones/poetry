const fridge = document.getElementById('refrigerator-area');
const poolBottom = document.getElementById('word-pool-bottom');
// NEW POOLS:
const poolTopLeft = document.getElementById('word-pool-left-top');
const poolTopRight = document.getElementById('word-pool-right-top');

// Filter the array to get ALL word pools
const allPools = [poolBottom, poolTopLeft, poolTopRight].filter(pool => pool !== null); 
const refreshButton = document.getElementById('refresh-button');
const ROW_HEIGHT = 35; 
let draggedElement = null;

// Function to convert CSV text into an array of words (ROBUST PARSER FIX)
function parseWords(csvText) {
    // CRITICAL FIX: Use regex to split lines, handling all line endings (\r\n, \r, \n)
    const lines = csvText.split(/[\r\n]+/).filter(line => line.trim() !== '');
    
    // The first line is the header row; subsequent lines are data
    const dataLines = lines.slice(1);
    
    let allWords = [];

    dataLines.forEach(line => {
        const cells = line.split(','); 
        
        cells.forEach(cell => {
            let word = cell.trim();

            // CRITICAL FIX: Remove potential surrounding quotation marks
            if (word.startsWith('"') && word.endsWith('"')) {
                word = word.substring(1, word.length - 1);
            }
            
            // Only add the word if it is not an empty string
            if (word.length > 0) {
                allWords.push(word);
            }
        });
    });
    
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
        
        // Distribute words across the available pools
        allPools[index % allPools.length].appendChild(tile);
    });
}


// --- REFRESH BUTTON LOGIC ---
function clearAndShuffle() {
    const allTiles = document.querySelectorAll('.word-tile');
    
    allTiles.forEach(tile => {
        if (poolBottom) {
            poolBottom.appendChild(tile);
        }
        
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
    
    if (allPools.length > 0) {
        const shuffledWords = Array.from(allTiles).sort(() => Math.random() - 0.5);
        
        shuffledWords.forEach((tile, index) => {
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

if (fridge) {
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

            // 2. Snap to Row Logic (uses the new ROW_HEIGHT of 65)
            const snappedTop = Math.round(rawTop / ROW_HEIGHT) * ROW_HEIGHT;
            const finalTop = Math.max(0, snappedTop); 
            
            // 3. Apply Positioning (horizontal freedom, vertical snap)
            draggedElement.style.left = rawLeft + 'px';
            draggedElement.style.top = finalTop + 'px'; 
            // Apply 5% scale to make the word tile wider and taller in the fridge
            draggedElement.style.transform = 'scale(1.05)'; 
            
            draggedElement = null; 
        }
    });
}


// --- DROP EVENT (on the word pools - to return a word) ---
allPools.forEach(pool => {
    // This pool is guaranteed to exist because of the filter at the top.
    pool.addEventListener('dragover', (e) => {
        e.preventDefault(); 
    });

    pool.addEventListener('drop', (e) => {
        e.preventDefault();
        
        if (draggedElement && draggedElement.classList.contains('word-tile')) {
            pool.appendChild(draggedElement); 
            
            draggedElement.style.position = '';
            draggedElement.style.left = '';
            draggedElement.style.top = '';
            draggedElement.style.transform = '';

            draggedElement = null;
        }
    });
});


// ----------------------------------------------------
// START APPLICATION
// ----------------------------------------------------
loadWordsAndCreateTiles();

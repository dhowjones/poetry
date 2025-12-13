const fridge = document.getElementById('refrigerator-area');
const poolBottom = document.getElementById('word-pool-bottom');
const poolLeft = document.getElementById('word-pool-left');
const poolRight = document.getElementById('word-pool-right');

// Collect ALL three word pools for word distribution
const allPools = [poolBottom, poolLeft, poolRight].filter(pool => pool !== null); 
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

// Function to create the HTML tiles and distribute them across ALL three pools
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
        
        // Distribute words across the available pools (0=bottom, 1=left, 2=right, 0=bottom, etc.)
        allPools[index % allPools.length].appendChild(tile);
    });
}


// --- REFRESH BUTTON LOGIC (Puts all tiles back and reshuffles them across all pools) ---
function clearAndShuffle() {
    const allTiles = document.querySelectorAll('.word-tile');
    
    allTiles.forEach(tile => {
        // Reset tile positioning/scaling regardless of which pool it will end up in
        tile.style.position = '';
        tile.style.left = '';
        tile.style.top = '';
        tile.style.transform = '';
    });
    
    // Restore the prompt if the fridge is empty
    if (fridge && !fridge.querySelector('.poem-prompt')) {
        const prompt = document.createElement('p');
        prompt.classList.add('poem-prompt');
        prompt.textContent = "Drag words here to begin your poem...";
        fridge.appendChild(prompt);
    }
    
    // Re-shuffle and re-distribute the words across all available pools
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
        e.dataTransfer.setData

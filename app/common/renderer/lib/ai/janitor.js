import fs from 'fs';
import path from 'path';

// Function to clear string attributes in an object recursively
function clearStringAttributes(obj) {
    if (obj !== null && typeof obj === 'object') {
        for (const key in obj) {
            if (typeof obj[key] === 'string') {
                obj[key] = '';
            } else if (typeof obj[key] === 'object') {
                clearStringAttributes(obj[key]);
            }
        }
    }
}

// Main function to read, process, and save the JSON file
async function processJsonFile(filePath) {
    try {
        const data = await fs.promises.readFile(filePath, 'utf8');
        const jsonObject = JSON.parse(data);
        clearStringAttributes(jsonObject);
        const outputFilePath = path.join(path.dirname(filePath), `empty_strings_${path.basename(filePath)}`);
        await fs.promises.writeFile(outputFilePath, JSON.stringify(jsonObject, null, 2));
        console.log(`Processed file saved as: ${outputFilePath}`);
    } catch (err) {
        console.error('Error:', err);
    }
}

// Get the file path from command line arguments
const args = process.argv.slice(2);
if (args.length !== 1) {
    console.error('Usage: node janitor.js <path_to_json_file>');
    process.exit(1);
}

const filePath = args[0];
processJsonFile(filePath);
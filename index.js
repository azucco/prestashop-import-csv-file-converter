const fs = require("fs");
const { parse } = require("csv-parse");
const string = require("string-sanitizer");

const productsCsvPath = './csv/products_to.csv';
const categoriesCsvPath = './csv/categories_to.csv';
const skippedCsvPath = './csv/skipped_to.csv';

let index = 1;
let categoryIndex = 3;

const categoryMap = new Map([
    ['01', 'Archeologia'],
    ['02', 'Storia'],
    ['03', "Storia dell'Arte"],
    ['04', 'Antropologia'],
    ['05', 'Geologia'],
    ['06', 'Guide'],
    ['07', 'Numismatica'],
    ['08', 'Varie'],
    ['09', 'Video e Cd'],
    ['01/00', 'Archeologia generale'],
    ['01/01', 'Archeologia miscellanee'],
    ['01/02', 'Archeologia preistorica e protostorica'],
    ['01/03', 'Archeologia egizia e mediorientale'],
    ['01/04', 'Archeologia italica'],
    ['01/05', 'Archeologia classica'],
    ['01/06', 'Archeologia medioevale'],
    ['01/07', 'Archeologia subacquea'],
    ['01/08', 'Archeologia precolombiana'],
    ['01/09', 'Archeologia orientale'],
    ['01/10', 'Archeologia sperimentale'],
    ['02/00', 'Storia generale'],
    ['02/01', 'Storia miscellanee'],
    ['02/02', 'Storia preistorica e protostorica'],
    ['02/03', 'Storia egizia e mediorientale'],
    ['02/04', 'Storia italica'],
    ['02/05', 'Storia classica'],
    ['02/06', 'Storia medioevale'],
    ['02/07', 'Storia moderna'],
    ['02/08', 'Storia contemporanea'],
    ['02/09', 'Epoca storica: Vicino e Medio Oriente'],
    ['02/10', 'Epoca storica: Estremo Oriente'],
    ['02/11', 'Storia precolombiana'],
    ['03/00', "Storia dell'Arte generale"],
    ['03/01', "Storia dell'Arte miscellanee"],
    ['03/02', "Storia dell'Arte preistorica e protostorica"],
    ['03/03', "Storia dell'Arte egizia e mediorientale"],
    ['03/04', "Storia dell'Arte italica"],
    ['03/05', "Storia dell'Arte classica"],
    ['03/06', "Storia dell'Arte medioevale"],
    ['03/07', "Storia dell'Arte moderna"],
    ['03/08', "Storia dell'Arte precolombiana"],
    ['03/09', "Storia dell'Arte orientale"],
    ['04/00', "Antropologia generale"],
    ['04/01', "Antropologia fisica"],
    ['04/02', "Antropologia culturale"],
    ['05/00', "Geologia generale"],
    ['06/00', "Guide generale"],
    ['07/00', "Numismatica generale"],
    ['07/04', "Numismatica italica"],
    ['08/00', "Varie generale"],
    ['09/00', "Video e Cd generale"],
]);

const savedCategories = new Set();

try {
    initProductsCsv();
    initCategoriesCsv();

    const homeCategoriesKeys = ['01', '02', '03', '04', '05', '06', '07', '08', '09'];

    homeCategoriesKeys.forEach( key => {
        if(saveCategory(key, categoryIndex) === 1) {
            categoryIndex++;
        } else {
            throw new Error('Conversion failed!');
        }
    });
    
    fs.createReadStream("./original.csv")
    .pipe(parse({ delimiter: ";", from_line: 2 }))
    .on("data", function (row) {
        const reference = row[1];
        if (reference.length < 3) {
            saveSkipped(row);
            return;
        }

        switch (saveCategory(row[1], categoryIndex)) {
            case -1:
                throw new Error('Conversion failed!');
            case 1:
                categoryIndex++;
            break;
        }

        if(!saveProduct(row, index)) {
            throw new Error('Conversion failed!');
        } else {
            index++;
        }
    })
    .on("error", function (error) {
        throw new Error(error.message);
    })
    .on("end", function () {
        console.log("CONVERSION SUCCEDED!");
    });
} catch (e) {
    console.log(e);
    console.log('CONVERSION FAILED!');
}



function initProductsCsv() {
    const csv = 'Product ID;Active (0/1);Name *;Summary;Reference #;Categories (x,y,z...);Quantity;Description;Meta title;Meta keywords;Meta description;URL rewritten;Show price (0 = No, 1 = Yes);Delete existing images (0 = No, 1 = Yes)';
    fs.writeFileSync(productsCsvPath, csv);
}
function initCategoriesCsv() {
    const csv = 'Category ID;Active (0/1);Name *;Parent category;Root category (0/1);Description;Meta title;Meta keywords;Meta description;URL rewritten;Image URL';
    fs.writeFileSync(categoriesCsvPath, csv);
}

  /**
 * @param {string[]}
 * @return number
 */
function saveCategory (referenceField, index) {
    let reference = referenceField.replaceAll('\\', '/');
    const categoryInfo = {
        'index': index-2,
        'reference': reference
    }
    try {
        const referenceElements = reference.split('/');
        const categoryKey = `${referenceElements[0]}` + (referenceElements[1] ? `/${referenceElements[1]}` : '');
        if (savedCategories.has(categoryKey)) {
            return 0;
        }

        const active = 1;
        const name = categoryMap.get(categoryKey);
        const parent = referenceElements.length === 1 ? 'Home' : categoryMap.get(referenceElements[0]);
        const root = 0;
        const description = `${name} (${referenceElements[0]}${referenceElements[1] ? '/' + referenceElements[1] : ''})`;
        const meta = name;
        const url = string.sanitize(name);
        const imageUrl = '';
    
        const csv = `\n${index};${active};${name};${parent};${root};${description};${meta};${meta};${meta};${url};${imageUrl};`;
        fs.appendFileSync(categoriesCsvPath, csv);
        savedCategories.add(categoryKey);
        console.log('Category saved:')
        console.info(categoryInfo);
        return 1;
    } catch (e) {
        console.log('Error saving category:');
        console.info(categoryInfo);
        console.info(e);
        return -1;
    }
}

  /**
 * @param {string[]}
 * @return bool
 */
function saveProduct (row, index) {
    let reference = row[1].replaceAll('\\', '/').replaceAll('n.', '');
    const name = row[6].substring(0, 128);
    const author = row[5];
    const productInfo = {
        'index': index,
        'reference': reference, 
        'title': name,
        'author': author,
    }
    try {
        const referenceElements = reference.split('/');
        const categoryKey = `${referenceElements[0]}` + (referenceElements[1] ? `/${referenceElements[1]}` : '');

        const active = 1;
        const summary = row[7];
        const category = categoryMap.get(categoryKey);
        const quantity = 1;
        const description = row[15] ?? '';
        const meta = `${name}, ${author}`.substring(0, 255);
        const url = string.sanitize(`${name}, ${author}`).substring(0, 128);
        const showPrice = 0;
        const deleteExistingImages = 0;
    
        const csvRow = `${index};${active};${name};${summary};${reference};${category};${quantity};${description};${meta};${meta};${meta};${url};${showPrice};${deleteExistingImages};`;
        const cleanedCsvRow = csvRow.replace(/(\r\n|\n|\r)/gm, "");
        
        fs.appendFileSync(productsCsvPath, `\n${cleanedCsvRow}`);
        console.log('Product saved:')
        console.info(productInfo);
        return true;
    } catch (e) {
        console.log('Error saving product:');
        console.info(productInfo);
        console.info(e);
        return false;
    }
}

function saveSkipped (row) {
    const csv = `\n${row};`;
    fs.appendFileSync(skippedCsvPath, csv);
}


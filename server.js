const express = require('express');
const fs = require('fs').promises;
const { existsSync, mkdirSync } = require('fs');
const path = require('path');
const app = express();
const port = 8000;

// Zorg dat we grote JSON bestanden (de foto's) kunnen ontvangen
app.use(express.json({ limit: '10mb' }));

const dataFile = path.join(__dirname, 'data', 'items.json');
const uploadDir = path.join(__dirname, 'data', 'uploads');

// Maak mappen aan als ze niet bestaan
if (!existsSync(path.join(__dirname, 'data'))) mkdirSync(path.join(__dirname, 'data'));
if (!existsSync(uploadDir)) mkdirSync(uploadDir);

// API endpoint voor de items
app.all('/api/items', async (req, res) => {
    // Forceer de browser om altijd de nieuwste data op te halen (voorkomt cache problemen)
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    if (req.method === 'GET') {
        try {
            const content = await fs.readFile(dataFile, 'utf8');
            res.json(JSON.parse(content || '[]'));
        } catch (e) {
            res.json([]);
        }
    } else if (req.method === 'POST') {
        const { image, title, description, author } = req.body;
        if (!image) {
            return res.status(400).json({ error: 'Geen afbeelding ontvangen' });
        }

        const base64Data = image.replace(/^data:image\/jpeg;base64,/, "");
        const fileName = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}.jpg`;
        const filePath = path.join(uploadDir, fileName);

        try {
            await fs.writeFile(filePath, base64Data, 'base64');

            let items = [];
            try {
                const content = await fs.readFile(dataFile, 'utf8');
                items = JSON.parse(content || '[]');
            } catch (e) {
                console.error("Kon items.json niet lezen, we beginnen een nieuwe lijst.");
            }
            
            const newItem = {
                src: `data/uploads/${fileName}`,
                title, description, author
            };
            
            items.push(newItem);
            await fs.writeFile(dataFile, JSON.stringify(items, null, 2));
            res.json({ success: true, item: newItem });
        } catch (err) {
            console.error("Upload fout:", err);
            res.status(500).json({ error: 'Opslaan mislukt' });
        }
    }
});

// Serveer specifieke mappen statisch voor veiligheid
app.use('/data', express.static(path.join(__dirname, 'data')));
app.use('/links', express.static(path.join(__dirname, 'links')));

// Serveer de hoofdindex en andere root-bestanden (css, js)
app.use(express.static(__dirname));

app.listen(port, () => console.log(`Waslijn server draait op http://localhost:${port}`));
/**
 * Converts a JSONL line (parkrun result) into HTML table row format
 * @param {string} jsonlLine - A single line from the JSONL file
 * @returns {string} HTML table row string
 */
function convertJsonlToHtml(jsonlLine) {
    try {
        // Parse the JSONL line
        const data = JSON.parse(jsonlLine);
        
        // Extract data fields
        const event = data.Event;
        const runDate = data["Run Date"];
        const runNumber = data["Run Number"];
        const position = data.Pos;
        const time = data.Time;
        const ageGrade = data.AgeGrade;
        const isPB = data["PB?"].trim() === "PB";
        
        // Generate unique ID for the row
        const rowId = `${event.toLowerCase()}-park-run-${runNumber}`;
        
        // Determine if it's a PB and format time accordingly
        const rowHighlight = isPB ? `bgcolor="#fff0e0"` : ``;
        
        // Generate parkrun URLs
        const eventUrl = `https://www.parkrun.org.uk/${event.toLowerCase()}/`;
        const resultsUrl = `${eventUrl}results/${runNumber}/`;
        
        // Get location and zipcode info based on event
        let location = "";
        let zipcode = "";
        
        if (event === "Bournemouth") {
            location = "Kings Park Athletic Stadium";
            zipcode = "BH7 6JD";
        } else if (event === "Battersea") {
            location = "London";
            zipcode = "SW11 4NJ";
        } else if (event === "Poole") {
            location = "Poole Park, Poole";
            zipcode = "BH15 2SF";
        } else {
            location = event;
            zipcode = "UK";
        }
        
        // Create the clickable badge
        const zipcodeBadge = `<a href="https://maps.google.com/?q=${zipcode.replace(' ', '+')}" target="_blank"><span class="postcode-badge">${zipcode}</span></a>`;
        
        // Combine location and badge
        const locationWithBadge = `<span class="location-caption">${location}</span> ${zipcodeBadge}`;
        
        // Generate the HTML table row
        const html = `
                <tbody data-type="5K">
                <tr id="${rowId}" ${rowHighlight}>
                    <td valign="middle">
                        ${time}
                        ${position ? `<br/><small class="position-age-grade">POS: #${position}</small>` : ''}
                        ${ageGrade ? `<br/><small class="position-age-grade">AG: ${ageGrade}</small>` : ''}
                    </td>
                    <td valign="middle">
                        <span class="distance-param">5K</span>
                    </td>
                    <td valign="middle" class="date-column">
                        <small>${runDate}</small>
                    </td>
                    <td valign="middle">
                        <a href="${resultsUrl}">
                            <runtitle>${event} Parkrun #${runNumber}</runtitle>
                        </a>
                        <br/>
                        ${locationWithBadge}
                    </td>
                    <td valign="middle">
                        <button class="share-button" onclick="shareRow(event)" style="width:100%"><i class="fa fa-share-alt"></i></button>
                    </td>
                </tr>
                </tbody>`;
        
        return html;
        
    } catch (error) {
        console.error('Error parsing JSONL line:', error);
        return '';
    }
}

function processJsonlToHtml(jsonlContent) {
    const lines = jsonlContent.trim().split('\n');
    let htmlContent = '';
    
    for (const line of lines) {
        if (line.trim()) {
            htmlContent += convertJsonlToHtml(line) + '\n';
        }
    }
    
    return htmlContent;
}

function loadJsonlAndConvert(filePath, callback, batchSize = 10) {
    fetch(filePath)
        .then(response => response.text())
        .then(content => {
            const lines = content.trim().split('\n').filter(line => line.trim());
            let currentBatch = [];
            let batchIndex = 0;
            
            // Create iterator function
            function* processBatch() {
                for (let i = 0; i < lines.length; i++) {
                    currentBatch.push(lines[i]);
                    
                    // Yield batch when it reaches batchSize or at the end
                    if (currentBatch.length === batchSize || i === lines.length - 1) {
                        const batchHtml = currentBatch.map(line => convertJsonlToHtml(line)).join('\n');
                        yield {
                            html: batchHtml,
                            batchIndex: batchIndex,
                            totalBatches: Math.ceil(lines.length / batchSize),
                            isLast: i === lines.length - 1
                        };
                        
                        currentBatch = [];
                        batchIndex++;
                    }
                }
            }
            
            // Process batches using iterator
            const iterator = processBatch();
            
            function processNextBatch() {
                const result = iterator.next();
                
                if (!result.done) {
                    const { html, batchIndex, totalBatches, isLast } = result.value;
                    callback(html, batchIndex, totalBatches, isLast);
                    
                    // Continue with next batch
                    processNextBatch();
                }
            }
            
            // Start processing
            processNextBatch();
        })
        .catch(error => {
            console.error('Error loading JSONL file:', error);
            callback('', 0, 0, true);
        });
}

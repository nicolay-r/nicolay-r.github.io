/**
 * Formats a date string (DD/MM/YYYY) as relative time (e.g., "5 days ago", "in 3 days")
 * @param {string} dateString - Date in DD/MM/YYYY format
 * @returns {string} Relative time string
 */
function formatRelativeTime(dateString) {
    // Parse DD/MM/YYYY format
    const [day, month, year] = dateString.split('/');
    const date = new Date(year, month - 1, day); // month is 0-indexed
    const now = new Date();
    
    const diffMs = date - now; // Positive for future dates, negative for past
    const diffSeconds = Math.floor(Math.abs(diffMs) / 1000);
    const diffMinutes = Math.floor(diffSeconds / 60);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);
    const diffWeeks = Math.floor(diffDays / 7);
    const diffMonths = Math.floor(diffDays / 30);
    const diffYears = Math.floor(diffDays / 365);
    
    const isFuture = diffMs > 0;
    const prefix = isFuture ? 'in ' : '';
    const suffix = isFuture ? '' : ' ago';
    
    if (diffSeconds < 60) {
        return `${prefix}${diffSeconds} second${diffSeconds !== 1 ? 's' : ''}${suffix}`;
    } else if (diffMinutes < 60) {
        return `${prefix}${diffMinutes} minute${diffMinutes !== 1 ? 's' : ''}${suffix}`;
    } else if (diffHours < 24) {
        return `${prefix}${diffHours} hour${diffHours !== 1 ? 's' : ''}${suffix}`;
    } else if (diffDays < 7) {
        return `${prefix}${diffDays} day${diffDays !== 1 ? 's' : ''}${suffix}`;
    } else if (diffWeeks < 4) {
        return `${prefix}${diffWeeks} week${diffWeeks !== 1 ? 's' : ''}${suffix}`;
    } else if (diffMonths < 12) {
        return `${prefix}${diffMonths} month${diffMonths !== 1 ? 's' : ''}${suffix}`;
    } else {
        return `${prefix}${diffYears} year${diffYears !== 1 ? 's' : ''}${suffix}`;
    }
}

/**
 * Creates a clickable zipcode badge with Google Maps link
 * @param {string} zipcode - The postcode to display
 * @returns {string} HTML string for the clickable badge
 */
function createZipcodeBadge(zipcode) {
    return `<a href="https://maps.google.com/?q=${zipcode.replace(' ', '+')}" target="_blank"><span class="postcode-badge">${zipcode}</span></a>`;
}

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
        const zipcodeBadge = createZipcodeBadge(zipcode);
        
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
                        <br/><small style="font-size: 0.85em; color: #6c757d;">${formatRelativeTime(runDate)}</small>
                    </td>
                    <td valign="middle">
                        <a href="${resultsUrl}">
                            <runtitle>${event} Parkrun #${runNumber}</runtitle>
                        </a>
                        <br/>
                        ${locationWithBadge}
                    </td>
                    <td valign="middle">
                        <button class="share-button" onclick="shareRow(event)"><i class="fa fa-share-alt"></i></button>
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

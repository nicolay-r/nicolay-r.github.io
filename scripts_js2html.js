function escapeHtml(s) {
    if (s === undefined || s === null) return '';
    return String(s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

/**
 * Formats a date string (DD/MM/YYYY) as relative time (e.g., "5 days ago", "in 3 days")
 * @param {string} dateString - Date in DD/MM/YYYY format
 * @returns {string} Relative time string
 */
function formatRelativeTime(dateString) {
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
    const q = encodeURIComponent(zipcode);
    return `<a href="https://maps.google.com/?q=${q}" target="_blank"><span class="postcode-badge">${escapeHtml(zipcode)}</span></a>`;
}

function buildRaceLinksHtml(links) {
    if (!links || !Array.isArray(links) || links.length === 0) {
        return '';
    }
    return links.map((link) => {
        const label = escapeHtml(link.text);
        const href = escapeHtml(link.href);
        const inner = link.bold ? `<b>${label}</b>` : label;
        return `<a href="${href}">${inner}</a>`;
    }).join(' / ');
}

/**
 * @param {object} data - Parsed JSON object for a non-parkrun race
 * @returns {string} HTML tbody string
 */
function convertRaceJsonToHtml(data) {
    const rowId = data.Id || data.id || 'race-row';
    const distance = (data.Distance || data.distance || '5K').trim();
    const dataType = distance.replace(/\s+/g, '');
    const time = escapeHtml(data.Time || data.time || '');
    const runDate = data['Run Date'] || data['run_date'] || data.Date || '';
    const title = escapeHtml(data.Title || data.title || '');
    const titleUrl = escapeHtml(data['Title Url'] || data['TitleUrl'] || data.title_url || '#');
    const location = escapeHtml(data.Location || data.location || '');
    const postcode = (data.Postcode || data.postcode || '').trim();
    const highlight = data.Highlight === true || data.highlight === true;
    const rowHighlight = highlight ? `bgcolor="#fff0e0"` : '';
    const linksHtml = buildRaceLinksHtml(data.Links || data.links);

    const postcodePart = postcode ? ` ${createZipcodeBadge(postcode)}` : '';
    const locationBlock = location || postcodePart
        ? `<br/>
                        <em><span class="location-caption">${location}</span></em>${postcodePart}`
        : '';

    const linksBlock = linksHtml
        ? `<br>
                        ${linksHtml}`
        : '';

    const relativeHtml = runDate
        ? `<br/><small style="font-size: 0.85em; color: #6c757d;">${escapeHtml(formatRelativeTime(runDate))}</small>`
        : '';

    return `
                <tbody data-type="${escapeHtml(dataType)}">
                <tr id="${escapeHtml(rowId)}" ${rowHighlight}>
                    <td valign="middle">
                        ${time}
                    </td>
                    <td valign="middle">
                        <span class="distance-param">${escapeHtml(distance)}</span>
                    </td>
                    <td valign="middle" class="date-column">
                        <small>${escapeHtml(runDate)}</small>${relativeHtml}
                    </td>
                    <td valign="middle">
                        <a href="${titleUrl}">
                            <runtitle>${title}</runtitle>
                        </a>${locationBlock}${linksBlock}
                    </td>
                    <td valign="middle">
                        <button class="share-button" onclick="shareRow(event)"><i class="fa fa-share-alt"></i></button>
                    </td>
                </tr>
                </tbody>`;
}

/**
 * @param {object} data - Parsed JSON object for parkrun
 * @returns {string} HTML tbody string
 */
function convertParkrunJsonToHtml(data) {
    const event = data.Event;
    const runDate = data['Run Date'];
    const runNumber = data['Run Number'];
    const position = data.Pos;
    const time = data.Time;
    const ageGrade = data.AgeGrade;
    const pbRaw = (data['PB?'] != null ? String(data['PB?']) : '').trim();
    const isPB = pbRaw === 'PB';

    const rowId = `${event.toLowerCase()}-park-run-${runNumber}`;

    const rowHighlight = isPB ? `bgcolor="#fff0e0"` : ``;

    const eventUrl = `https://www.parkrun.org.uk/${event.toLowerCase()}/`;
    const resultsUrl = `${eventUrl}results/${runNumber}/`;

    let location = '';
    let zipcode = '';

    if (event === 'Bournemouth') {
        location = 'Kings Park Athletic Stadium';
        zipcode = 'BH7 6JD';
    } else if (event === 'Battersea') {
        location = 'London';
        zipcode = 'SW11 4NJ';
    } else if (event === 'Poole') {
        location = 'Poole Park, Poole';
        zipcode = 'BH15 2SF';
    } else {
        location = event;
        zipcode = 'UK';
    }

    const zipcodeBadge = createZipcodeBadge(zipcode);
    const locationWithBadge = `<span class="location-caption">${escapeHtml(location)}</span> ${zipcodeBadge}`;

    const posBlock = position ? `<br/><small class="position-age-grade">POS: #${escapeHtml(position)}</small>` : '';
    const agBlock = ageGrade ? `<br/><small class="position-age-grade">AG: ${escapeHtml(ageGrade)}</small>` : '';

    return `
                <tbody data-type="5K">
                <tr id="${escapeHtml(rowId)}" ${rowHighlight}>
                    <td valign="middle">
                        ${escapeHtml(time)}
                        ${posBlock}
                        ${agBlock}
                    </td>
                    <td valign="middle">
                        <span class="distance-param">5K</span>
                    </td>
                    <td valign="middle" class="date-column">
                        <small>${escapeHtml(runDate)}</small>
                        <br/><small style="font-size: 0.85em; color: #6c757d;">${escapeHtml(formatRelativeTime(runDate))}</small>
                    </td>
                    <td valign="middle">
                        <a href="${escapeHtml(resultsUrl)}">
                            <runtitle>${escapeHtml(event)} Parkrun #${escapeHtml(runNumber)}</runtitle>
                        </a>
                        <br/>
                        ${locationWithBadge}
                    </td>
                    <td valign="middle">
                        <button class="share-button" onclick="shareRow(event)"><i class="fa fa-share-alt"></i></button>
                    </td>
                </tr>
                </tbody>`;
}

/**
 * Converts a JSONL line (parkrun or race) into HTML table row format
 * @param {string} jsonlLine - A single line from the JSONL file
 * @returns {string} HTML table row string
 */
function convertJsonlToHtml(jsonlLine) {
    try {
        const data = JSON.parse(jsonlLine.trim());
        if (data.Type === 'race' || data.type === 'race') {
            return convertRaceJsonToHtml(data);
        }
        return convertParkrunJsonToHtml(data);
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
                    const { html, batchIndex: bi, totalBatches, isLast } = result.value;
                    callback(html, bi, totalBatches, isLast);

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

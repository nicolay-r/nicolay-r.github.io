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
    } else if (diffDays < 30) {
        return `${prefix}${diffWeeks} week${diffWeeks !== 1 ? 's' : ''}${suffix}`;
    } else if (diffDays < 365) {
        return `${prefix}${diffMonths} month${diffMonths !== 1 ? 's' : ''}${suffix}`;
    } else {
        return `${prefix}${diffYears} year${diffYears !== 1 ? 's' : ''}${suffix}`;
    }
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

/** Parkrun event name → default location caption */
function getParkrunLocationCaption(eventName) {
    if (eventName === 'Bournemouth') {
        return 'Kings Park Athletic Stadium';
    }
    if (eventName === 'Battersea') {
        return 'London';
    }
    if (eventName === 'Poole') {
        return 'Poole Park, Poole';
    }
    return eventName;
}

/** Series key for collapse grouping: parkrun Event, otherwise race Id. */
function getRunningSeriesKey(data) {
    const event = data.Event;
    if (event != null && String(event).trim() !== '') {
        return String(event);
    }
    const id = data.Id ?? data.id;
    if (id != null && String(id).trim() !== '') {
        return String(id);
    }
    return '';
}

/**
 * Converts one parsed JSON object (parkrun row or Type:"race") into a results-table tbody.
 * @param {object} data - Parsed JSON line from running results JSONL
 * @returns {string} HTML tbody string
 */
function convertRunningJsonToHtml(data) {
    const isRace = data.Type === 'race' || data.type === 'race';

    let rowId;
    let filterDataType;
    let rowHighlight;
    let timeInnerHtml;
    let distanceLabelEscaped;
    let runDate;
    let titleHrefEscaped;
    let titleInnerEscaped;
    let afterTitleHtml;

    if (isRace) {
        rowId = data.Id || data.id || 'race-row';
        const distance = (data.Distance || data.distance || '5K').trim();
        filterDataType = distance.replace(/\s+/g, '');
        runDate = data['Run Date'] || data['run_date'] || data.Date || '';
        timeInnerHtml = escapeHtml(data.Time || data.time || '');
        distanceLabelEscaped = escapeHtml(distance);

        titleInnerEscaped = escapeHtml(data.Title || data.title || '');
        titleHrefEscaped = escapeHtml(
            data['Title Url'] || data['TitleUrl'] || data.title_url || '#'
        );

        const highlight = data.Highlight === true || data.highlight === true;
        rowHighlight = highlight ? 'bgcolor="#fff0e0"' : '';

        const locationEscaped = escapeHtml(data.Location || data.location || '');
        const locationBlock = locationEscaped
            ? `<br/>
                        <em><span class="location-caption">${locationEscaped}</span></em>`
            : '';

        const linksHtml = buildRaceLinksHtml(data.Links || data.links);
        const linksBlock = linksHtml ? `<br>\n                        ${linksHtml}` : '';

        afterTitleHtml = `${locationBlock}${linksBlock}`;
    } else {
        const event = data.Event;
        runDate = data['Run Date'];
        const runNumber = data['Run Number'];
        const position = data.Pos;
        const time = data.Time;
        const ageGrade = data.AgeGrade;
        const pbRaw = (data['PB?'] != null ? String(data['PB?']) : '').trim();
        const isPB = pbRaw === 'PB';

        rowId = `${String(event).toLowerCase()}-park-run-${runNumber}`;
        filterDataType = '5K';
        rowHighlight = isPB ? 'bgcolor="#fff0e0"' : '';

        const posBlock = position
            ? `<br/><small class="position-age-grade">POS: #${escapeHtml(position)}</small>`
            : '';
        const agBlock = ageGrade
            ? `<br/><small class="position-age-grade">AG: ${escapeHtml(ageGrade)}</small>`
            : '';
        timeInnerHtml = `${escapeHtml(time)}${posBlock}${agBlock}`;
        distanceLabelEscaped = '5K';

        const eventUrl = `https://www.parkrun.org.uk/${String(event).toLowerCase()}/`;
        const resultsUrl = `${eventUrl}results/${runNumber}/`;
        titleHrefEscaped = escapeHtml(resultsUrl);
        titleInnerEscaped = escapeHtml(`${event} Parkrun #${runNumber}`);

        const locationCaption = getParkrunLocationCaption(event);
        afterTitleHtml = `<br/>
                        <span class="location-caption">${escapeHtml(locationCaption)}</span>`;
    }

    const relativeHtml = runDate
        ? `<br/><small style="font-size: 0.85em; color: #6c757d;">${escapeHtml(formatRelativeTime(runDate))}</small>`
        : '';

    const seriesKey = getRunningSeriesKey(data);
    const seriesAttr = seriesKey ? ` data-event="${escapeHtml(seriesKey)}"` : '';

    return `
                <tbody data-type="${escapeHtml(filterDataType)}"${seriesAttr}>
                <tr id="${escapeHtml(rowId)}" ${rowHighlight}>
                    <td valign="middle">
                        ${timeInnerHtml}
                    </td>
                    <td valign="middle">
                        <span class="distance-param">${distanceLabelEscaped}</span>
                    </td>
                    <td valign="middle" class="date-column">
                        <small>${escapeHtml(runDate)}</small>${relativeHtml}
                    </td>
                    <td valign="middle">
                        <a href="${titleHrefEscaped}">
                            <runtitle>${titleInnerEscaped}</runtitle>
                        </a>${afterTitleHtml}
                    </td>
                </tr>
                </tbody>`;
}

function createRunningExpandRow({ groupId, hiddenCount, firstRow }) {
    const tbody = document.createElement('tbody');
    tbody.className = 'running-expand-row';
    tbody.dataset.runningGroup = groupId;
    tbody.dataset.type = firstRow.dataset.type;

    const label = hiddenCount === 1
        ? 'expand for 1 more'
        : `expand for ${hiddenCount} more`;

    tbody.innerHTML = `
        <tr>
            <td colspan="4" align="center" class="running-expand-cell">
                <button type="button" class="running-expand-link" data-running-group="${escapeHtml(groupId)}">${escapeHtml(label)}</button>
            </td>
        </tr>`;
    return tbody;
}

const RUNNING_RESULTS_COLLAPSE_OPTIONS = {
    tableSelector: '.results-table',
    rowSelector: 'tbody[data-type][data-event]',
    collapsedClass: 'running-row-collapsed',
    expandRowClass: 'running-expand-row',
    expandLinkSelector: '.running-expand-link',
    groupDataAttr: 'runningGroup',
    groupIdPrefix: 'running-group-',
    boundDataAttr: 'runningCollapseBound',
    minGroupSize: 3,
    isRowVisible: (row) => row.style.display !== 'none',
    getSeriesKey: (row) => row.dataset.event,
    createExpandRow: createRunningExpandRow,
};

function initRunningEventCollapse(table) {
    initConsecutiveRowCollapse(table, RUNNING_RESULTS_COLLAPSE_OPTIONS);
}

function refreshRunningEventCollapse() {
    refreshConsecutiveRowCollapse(RUNNING_RESULTS_COLLAPSE_OPTIONS);
}

/**
 * Converts a JSONL line (parkrun or race) into HTML table row format
 * @param {string} jsonlLine - A single line from the JSONL file
 * @returns {string} HTML table row string
 */
function convertJsonlToHtml(jsonlLine) {
    try {
        const data = JSON.parse(jsonlLine.trim());
        return convertRunningJsonToHtml(data);
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

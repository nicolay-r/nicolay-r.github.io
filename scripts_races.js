function escapeHtml(s) {
    if (s === undefined || s === null) return '';
    return String(s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
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

function rankToken(value) {
    return escapeHtml(String(value).replace(/\.$/, ''));
}

function buildRaceRankHtml(data) {
    const rankLines = [];
    const pos = data.Pos ?? data.pos;
    const field = data.Field ?? data.field;
    if (pos) {
        const fieldHtml = field ? `/${escapeHtml(field)}` : '';
        rankLines.push(`POS: #${rankToken(pos)}${fieldHtml}`);
    }
    const mfRank = data.MFRank ?? data.mfRank;
    const mfField = data.MFField ?? data.mfField;
    if (mfRank) {
        const fieldHtml = mfField ? `/${escapeHtml(mfField)}` : '';
        rankLines.push(`MF: #${rankToken(mfRank)}${fieldHtml}`);
    }
    const agRank = data.AGRank ?? data.agRank;
    const agField = data.AGField ?? data.agField;
    if (agRank) {
        const fieldHtml = agField ? `/${escapeHtml(agField)}` : '';
        rankLines.push(`AG: #${rankToken(agRank)}${fieldHtml}`);
    }
    if (!rankLines.length) {
        return '';
    }
    return rankLines.map((line) => `<br/><small class="position-age-grade">${line}</small>`).join('');
}

function buildRaceAfterTitleHtml(data) {
    const locationEscaped = escapeHtml(data.Location || data.location || '');
    const locationBlock = locationEscaped
        ? `<br/>
                        <em><span class="location-caption">${locationEscaped}</span></em>`
        : '';
    const linksHtml = buildRaceLinksHtml(data.Links || data.links);
    const linksBlock = linksHtml ? `<br>\n                        ${linksHtml}` : '';
    return `${locationBlock}${linksBlock}`;
}

/** Non-parkrun, non-triathlon race. */
function buildCustomRace(data) {
    const distance = (data.Distance || data.distance || '5K').trim();
    const highlight = data.Highlight === true || data.highlight === true;
    return {
        rowId: data.Id || data.id || 'race-row',
        filterDataType: distance.replace(/\s+/g, ''),
        rowHighlight: highlight ? 'bgcolor="#fff0e0"' : '',
        timeInnerHtml: `${escapeHtml(data.Time || data.time || '')}${buildRaceRankHtml(data)}`,
        distanceLabelEscaped: escapeHtml(distance),
        runDate: data['Run Date'] || data['run_date'] || data.Date || '',
        titleHrefEscaped: escapeHtml(data['Title Url'] || data['TitleUrl'] || data.title_url || '#'),
        titleInnerEscaped: escapeHtml(data.Title || data.title || ''),
        afterTitleHtml: buildRaceAfterTitleHtml(data),
        splitsBlock: '',
    };
}

function buildTriSplitsBlock(data, rowHighlight) {
    const splits = Array.isArray(data.Splits) ? data.Splits : (Array.isArray(data.splits) ? data.splits : []);
    const splitHeaders = [];
    const splitTimes = [];
    splits.forEach((split) => {
        const name = String(split.name || split.Name || split.Split || '').trim();
        let splitTime = String(split.time || split.Time || '').trim();
        if (!name || !splitTime) {
            return;
        }
        if (splitTime.startsWith('00:')) {
            splitTime = splitTime.slice(3);
        }
        splitHeaders.push(`<span class="tri-splits-name">${escapeHtml(name)}</span>`);
        splitTimes.push(`<span class="tri-splits-time">${escapeHtml(splitTime)}</span>`);
    });
    if (!splitHeaders.length) {
        return '';
    }
    return `<tr ${rowHighlight}><td colspan="4" class="tri-splits-cell"><div class="tri-splits-fit"><div class="tri-splits">${splitHeaders.join('')}${splitTimes.join('')}</div></div></td></tr>`;
}

function buildTriRace(data) {
    const row = buildCustomRace(data);
    row.filterDataType = 'TRI';
    row.splitsBlock = buildTriSplitsBlock(data, row.rowHighlight);
    return row;
}

function buildParkrun(data) {
    const event = data.Event;
    const runNumber = data['Run Number'];
    const position = data.Pos;
    const ageGrade = data.AgeGrade;
    const pbRaw = (data['PB?'] != null ? String(data['PB?']) : '').trim();
    const posBlock = position
        ? `<br/><small class="position-age-grade">POS: #${escapeHtml(position)}</small>`
        : '';
    const agBlock = ageGrade
        ? `<br/><small class="position-age-grade">AG: ${escapeHtml(ageGrade)}</small>`
        : '';
    const eventUrl = `https://www.parkrun.org.uk/${String(event).toLowerCase()}/`;
    return {
        rowId: `${String(event).toLowerCase()}-park-run-${runNumber}`,
        filterDataType: '5K',
        rowHighlight: pbRaw === 'PB' ? 'bgcolor="#fff0e0"' : '',
        timeInnerHtml: `${escapeHtml(data.Time)}${posBlock}${agBlock}`,
        distanceLabelEscaped: '5K',
        runDate: data['Run Date'],
        titleHrefEscaped: escapeHtml(`${eventUrl}results/${runNumber}/`),
        titleInnerEscaped: escapeHtml(`${event} Parkrun #${runNumber}`),
        afterTitleHtml: `<br/>
                        <span class="location-caption">${escapeHtml(event)}</span>`,
        splitsBlock: '',
    };
}

const RACE_BUILDERS = {
    triathlon: buildTriRace,
    parkrun: buildParkrun,
    race: buildCustomRace,
};

function raceBuilderKey(data) {
    const recordType = String(data.Type || data.type || '').toLowerCase();
    if (recordType) {
        return recordType;
    }
    if (data.Event != null && data['Run Number'] != null) {
        return 'parkrun';
    }
    return 'race';
}

function renderResultsTbody(data, row) {
    const relativeHtml = row.runDate
        ? `<br/><small style="font-size: 0.85em; color: #6c757d;">${escapeHtml(formatRelativeTime(row.runDate))}</small>`
        : '';
    const seriesKey = getRunningSeriesKey(data);
    const seriesAttr = seriesKey ? ` data-event="${escapeHtml(seriesKey)}"` : '';
    const dateAttr = row.runDate ? ` data-run-date="${escapeHtml(row.runDate)}"` : '';

    return `
                <tbody data-type="${escapeHtml(row.filterDataType)}"${seriesAttr}${dateAttr}>
                <tr id="${escapeHtml(row.rowId)}" ${row.rowHighlight}>
                    <td valign="top">
                        ${row.timeInnerHtml}
                    </td>
                    <td valign="top">
                        <span class="distance-param">${row.distanceLabelEscaped}</span>
                    </td>
                    <td valign="top" class="date-column">
                        <small>${escapeHtml(row.runDate)}</small>${relativeHtml}
                    </td>
                    <td valign="top">
                        <a href="${row.titleHrefEscaped}">
                            <runtitle>${row.titleInnerEscaped}</runtitle>
                        </a>${row.afterTitleHtml}
                    </td>
                </tr>
                ${row.splitsBlock}
                </tbody>`;
}

/**
 * Converts one parsed JSON object into a results-table tbody.
 * @param {object} data - Parsed JSON line from running results JSONL
 * @returns {string} HTML tbody string
 */
function racesJsonToHtml(data) {
    const build = RACE_BUILDERS[raceBuilderKey(data)] || buildCustomRace;
    return renderResultsTbody(data, build(data));
}

function createRunningExpandRow({ groupId, hiddenCount, firstRow }) {
    const tbody = document.createElement('tbody');
    tbody.className = 'race-expand-row';
    tbody.dataset.raceGroup = groupId;
    tbody.dataset.type = firstRow.dataset.type;

    const label = hiddenCount === 1
        ? 'expand for 1 more'
        : `expand for ${hiddenCount} more`;

    tbody.innerHTML = `
        <tr>
            <td colspan="4" align="center" class="expand-cell">
                <button type="button" class="expand-link" data-race-group="${escapeHtml(groupId)}">${escapeHtml(label)}</button>
            </td>
        </tr>`;
    return tbody;
}

const RUNNING_RESULTS_COLLAPSE_OPTIONS = {
    tableSelector: '.results-table',
    rowSelector: 'tbody[data-type][data-event]',
    collapsedClass: 'race-row-collapsed',
    expandRowClass: 'race-expand-row',
    expandLinkSelector: '.expand-link',
    groupDataAttr: 'raceGroup',
    groupIdPrefix: 'race-group-',
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
        return racesJsonToHtml(data);
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

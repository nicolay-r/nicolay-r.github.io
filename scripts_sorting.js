function sortTableByDate(table) {
    const tbodyElements = Array.from(table.querySelectorAll('tbody[data-type]'));

    // Sort tbody elements by date
    tbodyElements.sort((a, b) => {
        const dateA = extractDateFromRow(a);
        const dateB = extractDateFromRow(b);

        // Sort newest first
        return dateB - dateA;
    });

    // Re-append sorted tbody elements
    tbodyElements.forEach(tbody => {
        table.appendChild(tbody);
    });
}


function extractDateFromRow(tbody) {
    const dateAttr = tbody.getAttribute('data-run-date');
    if (dateAttr) {
        const fromAttr = parseRunningDate(dateAttr);
        if (fromAttr) {
            return fromAttr;
        }
    }

    const dateCell = tbody.querySelector('td:nth-child(3)'); // Date is in 3rd column
    if (dateCell) {
        // Match DD/MM/YYYY — cell may also contain relative time (e.g. parkrun rows)
        const fromCell = parseRunningDate(dateCell.textContent);
        if (fromCell) {
            return fromCell;
        }
    }
    return new Date(0); // Return epoch date if parsing fails
}

function parseRunningDate(text) {
    const m = String(text).match(/(\d{2})\/(\d{2})\/(\d{4})/);
    if (!m) {
        return null;
    }
    return new Date(parseInt(m[3], 10), parseInt(m[2], 10) - 1, parseInt(m[1], 10));
}

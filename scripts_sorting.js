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
    const dateCell = tbody.querySelector('td:nth-child(3)'); // Date is in 3rd column
    if (dateCell) {
        // Match DD/MM/YYYY — cell may also contain relative time (e.g. parkrun rows)
        const m = dateCell.textContent.match(/(\d{2})\/(\d{2})\/(\d{4})/);
        if (m) {
            const day = parseInt(m[1], 10);
            const month = parseInt(m[2], 10) - 1;
            const year = parseInt(m[3], 10);
            return new Date(year, month, day);
        }
    }
    return new Date(0); // Return epoch date if parsing fails
}

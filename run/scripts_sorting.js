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
        const dateText = dateCell.textContent.trim();
        const [day, month, year] = dateText.split('/');
        return new Date(year, month - 1, day);
    }
    return new Date(0); // Return epoch date if parsing fails
}

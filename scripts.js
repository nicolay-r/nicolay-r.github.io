function filterTable() {
    var checkboxes = document.querySelectorAll('.filter-checkbox');

    checkboxes.forEach(function(checkbox) {
        checkbox.addEventListener('change', function() {

            ///////////////////////////////////////////////////////////////////////
            // Changing logic.
            ///////////////////////////////////////////////////////////////////////
            const checkboxStates = {};
            checkboxes.forEach(cb => {
                const data_type = cb.id.replace('Checkbox', '');
                checkboxStates[data_type] = cb.checked;
            });
            const allUnchecked = Object.values(checkboxStates).every(value => !value);
            if (allUnchecked) {
              // Make all of them checked.
              checkboxes.forEach(cb => { cb.checked = true; });
            }
            else {
              // Keep only this checked.
              checkboxes.forEach(cb => { cb.checked = cb === this; });
            }

            ///////////////////////////////////////////////////////////////////////
            // Rows filtering logic.
            ///////////////////////////////////////////////////////////////////////
            // Step 1. Compose checkbox states.
            const checkboxStatesModified = {};
            checkboxes.forEach(cb => {
                const data_type = cb.id.replace('Checkbox', '');
                checkboxStatesModified[data_type] = cb.checked;
            });
            // Step 2. Filtering.
            const rowsWithDataType = document.querySelectorAll('[data-type]');
            rowsWithDataType.forEach(function(row) {
                row.style.display = checkboxStatesModified[row.dataset.type] ? '' : 'none';
            });
        });
    });
}
filterTable();

function shareRow(event) {
    const button = event.target;

    const row = button.closest('tr');

    const rowId = row.id;

    let currentUrl = window.location.href.split('#')[0];
    const fullUrl = `${currentUrl}#${rowId}`;
    const shareText = `${fullUrl}`;

    // Adopt WebShare API.
    if (navigator.share) {
        navigator.share({
            title: 'Share this item',
            url: fullUrl,
        }).then(() => {
            console.log('Successfully shared');
        }).catch((error) => {
            console.error('Error sharing:', error);
        });
    } else if (navigator.clipboard) {
        navigator.clipboard.writeText(fullUrl)
        .then(() => {
            alert('Link copied to clipboard!');
        }).catch(err => {
            console.error('Failed to copy: ', err);
        });
    } else {
        // Fallback for older browsers
        const tempInput = document.createElement('input');
        tempInput.value = fullUrl;
        document.body.appendChild(tempInput);
        tempInput.select();
        try {
          document.execCommand('copy');
          alert('Link copied to clipboard!');
        } catch (err) {
          alert('Copy this link: ' + fullUrl);
        }
        document.body.removeChild(tempInput);
    }
}
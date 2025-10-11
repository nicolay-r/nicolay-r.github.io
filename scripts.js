function filterTable() {
    var checkboxes = document.querySelectorAll('.filter-checkbox');

    checkboxes.forEach(function(checkbox) {
        checkbox.addEventListener('change', function() {
            ///////////////////////////////////////////////////////////////////////
            // Checkbox states changing logic.
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

function initializeTabRibbon() {
    const tabHeaders = document.querySelectorAll('.tab-header');
    
    tabHeaders.forEach(function(header) {
        header.addEventListener('click', function() {
            // Remove active class from all tab headers
            tabHeaders.forEach(h => h.classList.remove('active'));
            
            // Add active class to clicked tab header
            this.classList.add('active');
            
            // Get the tab type from data-tab attribute
            const selectedTab = this.getAttribute('data-tab');
            
            // Hide all tab content
            const tabContents = document.querySelectorAll('.tab-content');
            tabContents.forEach(function(content) {
                content.style.display = 'none';
            });
            
            // Show the selected tab content
            const selectedContent = document.getElementById(selectedTab + '-content');
            if (selectedContent) {
                selectedContent.style.display = 'block';
                
                // If switching to PROFESSIONAL tab, reinitialize the filter logic
                if (selectedTab === 'professional') {
                    // Show all rows initially
                    const rowsWithDataType = document.querySelectorAll('[data-type]');
                    rowsWithDataType.forEach(function(row) {
                        row.style.display = '';
                    });
                }
            }
        });
    });
    
    // Initialize with the first tab (PROFESSIONAL) active
    if (tabHeaders.length > 0) {
        tabHeaders[0].click();
    }
}
initializeTabRibbon();


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
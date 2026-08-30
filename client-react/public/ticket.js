// ticket.js – Ticket preview interaction logic

document.addEventListener('DOMContentLoaded', () => {
    const downloadBtn = document.getElementById('downloadTicketBtn');

    if (downloadBtn) {
        downloadBtn.addEventListener('click', () => {
            // Trigger native print dialog so students can Save as PDF / Print ticket
            window.print();
        });
    }
});

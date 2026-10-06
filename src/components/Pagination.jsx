import React from 'react';
import './Pagination.css';

const Pagination = ({
  currentPage = 1,
  totalItems = 0,
  itemsPerPage = 10,
  onPageChange,
  itemName = 'records'
}) => {
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;

  if (totalItems <= 0) return null;

  const startRecord = (currentPage - 1) * itemsPerPage + 1;
  const endRecord = Math.min(currentPage * itemsPerPage, totalItems);

  const getPageNumbers = () => {
    const pages = [];
    const maxVisiblePages = 5;

    if (totalPages <= maxVisiblePages + 2) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);
      
      let start = Math.max(2, currentPage - 1);
      let end = Math.min(totalPages - 1, currentPage + 1);

      if (currentPage <= 3) {
        start = 2;
        end = 4;
      } else if (currentPage >= totalPages - 2) {
        start = totalPages - 3;
        end = totalPages - 1;
      }

      if (start > 2) {
        pages.push('...');
      }

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      if (end < totalPages - 1) {
        pages.push('...');
      }

      pages.push(totalPages);
    }
    return pages;
  };

  return (
    <div className="crm-pagination-bar">
      <div className="crm-pagination-info">
        Showing <strong>{startRecord}</strong> - <strong>{endRecord}</strong> of <strong>{totalItems}</strong> {itemName}
      </div>

      <div className="crm-pagination-controls">
        <button
          type="button"
          className="crm-page-btn crm-page-nav-btn"
          onClick={() => onPageChange(Math.max(currentPage - 1, 1))}
          disabled={currentPage === 1}
          title="Previous Page"
          aria-label="Previous Page"
        >
          &lt;
        </button>

        {getPageNumbers().map((page, index) => {
          if (page === '...') {
            return (
              <span key={`ellipsis-${index}`} className="crm-page-ellipsis">
                …
              </span>
            );
          }

          return (
            <button
              key={page}
              type="button"
              className={`crm-page-btn ${currentPage === page ? 'active' : ''}`}
              onClick={() => onPageChange(page)}
              aria-label={`Page ${page}`}
            >
              {page}
            </button>
          );
        })}

        <button
          type="button"
          className="crm-page-btn crm-page-nav-btn"
          onClick={() => onPageChange(Math.min(currentPage + 1, totalPages))}
          disabled={currentPage === totalPages}
          title="Next Page"
          aria-label="Next Page"
        >
          &gt;
        </button>
      </div>
    </div>
  );
};

export default Pagination;

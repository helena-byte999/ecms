import React from "react";
import Pagination from "react-responsive-pagination";
// Bootstrap 4.x styles included somewhere in the project
import "./pagination.css";

function RPagination({ pagination, setPagination, perPage = 10 }) {
  const total = Math.ceil((pagination.count || 0) / perPage);
  // nothing to page through
  if (total <= 1) return null;

  return (
    <Pagination
      total={total}
      current={pagination.current}
      onPageChange={(page) => setPagination({ ...pagination, current: page })}
    />
  );
}

export default RPagination;

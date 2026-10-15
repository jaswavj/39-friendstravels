import React from 'react';
import { downloadXlsx, ExcelSheet, printReport } from './reportExport';

type Props = {
  disabled?: boolean;
  filename: string;
  sheets: ExcelSheet[];
};

const ReportActions: React.FC<Props> = ({ disabled, filename, sheets }) => (
  <>
    <button className="mst-btn mst-btn-outline" type="button" disabled={disabled} onClick={() => printReport()}>
      <i className="fas fa-print" /> Print
    </button>
    <button
      className="mst-btn mst-btn-outline"
      type="button"
      disabled={disabled}
      onClick={() => downloadXlsx(filename, sheets)}
    >
      <i className="fas fa-file-excel" /> XLSX
    </button>
  </>
);

export default ReportActions;

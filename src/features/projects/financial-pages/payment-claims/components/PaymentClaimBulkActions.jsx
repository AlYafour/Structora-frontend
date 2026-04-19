/**
 * PaymentClaimBulkActions Component
 * Bulk selection and delete actions bar
 */
import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { FaTrash, FaTimes, FaCheckSquare } from 'react-icons/fa';
import Button from '../../../../../components/common/Button';
import './PaymentClaimComponents.css';

const PaymentClaimBulkActions = memo(function PaymentClaimBulkActions({
 selectedCount,
 totalCount,
 onSelectAll,
 onDeselectAll,
 onDelete,
}) {
 const { t } = useTranslation();

 if (selectedCount === 0) return null;

 return (
 <div className="bulk-actions-bar">
 <div className="bulk-actions-info">
 <span className="bulk-count">{selectedCount}</span>
 <span className="bulk-label">
 {t('items_selected') || 'عنصر محدد'}
 </span>
 </div>

 <div className="bulk-actions-buttons">
 {selectedCount < totalCount && (
 <Button
 type="button"
 variant="ghost"
 size="small"
 onClick={onSelectAll}
 >
 <FaCheckSquare className="ds-ms-1" />
 {t('select_all') || 'تحديد الكل'} ({totalCount})
 </Button>
 )}

 <Button
 type="button"
 variant="ghost"
 size="small"
 onClick={onDeselectAll}
 >
 <FaTimes className="ds-ms-1" />
 {t('deselect_all') || 'إلغاء التحديد'}
 </Button>

 <Button
 type="button"
 variant="danger"
 size="small"
 onClick={onDelete}
 >
 <FaTrash className="ds-ms-1" />
 {t('delete_selected') || 'حذف المحدد'}
 </Button>
 </div>
 </div>
 );
});

export default PaymentClaimBulkActions;

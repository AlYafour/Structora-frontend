/**
 * BOQ Table Component
 * Displays BOQ data in an editable table format
 */
import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import Button from "../../../components/common/Button";
import Dialog from "../../../components/common/Dialog";
import { formatMoney } from "../../../utils/formatters";
import "./BOQTable.css";

export default function BOQTable({ sections, items, loading, onItemUpdate, onItemDelete, onItemCreate }) {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';

  const [editingItem, setEditingItem] = useState(null);
  const [newItem, setNewItem] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  // Group items by section
  const itemsBySection = useMemo(() => {
    const grouped = {};
    if (!items || !Array.isArray(items)) {
      return grouped;
    }
    
    // If we have items but no sections, create a temporary section structure
    if ((!sections || sections.length === 0) && items.length > 0) {
      const sectionIds = [...new Set(items.map(item => item.section).filter(Boolean))];
      sectionIds.forEach(sectionId => {
        // Find first item with this section to get section info
        const firstItem = items.find(item => item.section === sectionId);
        if (firstItem) {
          grouped[sectionId] = items.filter(item => item && item.section === sectionId);
        }
      });
      return grouped;
    }
    
    if (!sections || !Array.isArray(sections)) {
      return grouped;
    }
    
    sections.forEach(section => {
      if (section && section.id) {
        grouped[section.id] = items.filter(item => item && item.section === section.id);
      }
    });
    
    return grouped;
  }, [sections, items]);

  const handleEdit = (item) => {
    setEditingItem({ ...item });
  };

  const handleSaveEdit = () => {
    if (editingItem) {
      onItemUpdate(editingItem.id, editingItem);
      setEditingItem(null);
    }
  };

  const handleCancelEdit = () => {
    setEditingItem(null);
  };

  const handleAddNew = (sectionId) => {
    setNewItem({
      section: sectionId,
      item_code: '',
      description: '',
      unit: '',
      qty: 0,
      rate: 0,
      amount: 0,
      previous_percent: 0,
      current_percent: 0,
      total_percent: 0,
      previous_amount: 0,
      current_amount: 0,
      total_amount: 0,
      order: itemsBySection[sectionId]?.length || 0,
    });
  };

  const handleSaveNew = () => {
    if (newItem) {
      onItemCreate(newItem);
      setNewItem(null);
    }
  };

  const handleCancelNew = () => {
    setNewItem(null);
  };

  const handleDelete = (item) => {
    setDeleteConfirm(item);
  };

  const confirmDelete = () => {
    if (deleteConfirm) {
      onItemDelete(deleteConfirm.id);
      setDeleteConfirm(null);
    }
  };

  const updateField = (item, field, value) => {
    const updated = { ...item };
    updated[field] = value;
    
    // Auto-calculate amount if qty or rate changed
    if (field === 'qty' || field === 'rate') {
      updated.amount = (parseFloat(updated.qty) || 0) * (parseFloat(updated.rate) || 0);
    }
    
    // Auto-calculate percentage-based amounts
    if (field.includes('percent') || field === 'amount') {
      const amount = parseFloat(updated.amount) || 0;
      if (updated.previous_percent) {
        updated.previous_amount = (amount * parseFloat(updated.previous_percent)) / 100;
      }
      if (updated.current_percent) {
        updated.current_amount = (amount * parseFloat(updated.current_percent)) / 100;
      }
      if (updated.total_percent) {
        updated.total_amount = (amount * parseFloat(updated.total_percent)) / 100;
      }
    }
    
    return updated;
  };

  // If no sections but we have items, create a display structure
  const displaySections = useMemo(() => {
    if (sections && sections.length > 0) {
      return sections;
    }
    if (items && items.length > 0) {
      const sectionIds = [...new Set(items.map(item => item.section).filter(Boolean))];
      return sectionIds.map(sectionId => ({
        id: sectionId,
        section_name: `Section ${sectionId}`,
        bill_no: '',
        description: '',
      }));
    }
    return [];
  }, [sections, items]);

  if (loading) {
    return <div className="boq-table-loading">{t('boq_loading') || 'Loading...'}</div>;
  }

  if (!displaySections || displaySections.length === 0) {
    return (
      <div className="boq-table-empty">
        <p>{t('boq_no_data') || 'No BOQ data found. Import data to get started.'}</p>
        <p className="boq-table__empty-hint">
          {t('boq_no_sections') || 'No sections found. Please import data first.'}
        </p>
      </div>
    );
  }

  return (
    <div className="boq-table" dir={isRTL ? 'rtl' : 'ltr'}>
      {displaySections && displaySections.length > 0 ? (
        displaySections.map(section => {
          const sectionItems = itemsBySection[section.id] || [];
          return (
        <div key={section.id} className="boq-section">
          <div className="boq-section-header">
            <h3>{section.bill_no} {section.bill_no && section.section_name && ' - '} {section.section_name}</h3>
            <Button
              onClick={() => handleAddNew(section.id)}
              variant="primary"
              size="small"
            >
              {t('boq_add_item') || '+ Add Item'}
            </Button>
          </div>

          <table className="boq-items-table">
            <thead>
              <tr>
                <th>{t('boq_item_code') || 'Code'}</th>
                <th>{t('boq_description') || 'Description'}</th>
                <th>{t('boq_unit') || 'Unit'}</th>
                <th>{t('boq_qty') || 'Qty'}</th>
                <th>{t('boq_rate') || 'Rate'}</th>
                <th>{t('boq_amount') || 'Amount'}</th>
                <th>{t('boq_previous_percent') || 'Prev %'}</th>
                <th>{t('boq_current_percent') || 'Curr %'}</th>
                <th>{t('boq_total_percent') || 'Total %'}</th>
                <th>{t('boq_actions') || 'Actions'}</th>
              </tr>
            </thead>
            <tbody>
              {/* New Item Row */}
              {newItem && newItem.section === section.id && (
                <tr className="boq-item-row editing">
                  <td>
                    <input
                      type="text"
                      value={newItem.item_code}
                      onChange={(e) => setNewItem(updateField(newItem, 'item_code', e.target.value))}
                      placeholder={t('boq_item_code') || 'Code'}
                    />
                  </td>
                  <td>
                    <input
                      type="text"
                      value={newItem.description}
                      onChange={(e) => setNewItem(updateField(newItem, 'description', e.target.value))}
                      placeholder={t('boq_description') || 'Description'}
                    />
                  </td>
                  <td>
                    <input
                      type="text"
                      value={newItem.unit}
                      onChange={(e) => setNewItem(updateField(newItem, 'unit', e.target.value))}
                      placeholder={t('boq_unit') || 'Unit'}
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      value={newItem.qty}
                      onChange={(e) => setNewItem(updateField(newItem, 'qty', parseFloat(e.target.value) || 0))}
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      value={newItem.rate}
                      onChange={(e) => setNewItem(updateField(newItem, 'rate', parseFloat(e.target.value) || 0))}
                    />
                  </td>
                  <td>{formatMoney(newItem.amount)}</td>
                  <td>
                    <input
                      type="number"
                      value={newItem.previous_percent}
                      onChange={(e) => setNewItem(updateField(newItem, 'previous_percent', parseFloat(e.target.value) || 0))}
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      value={newItem.current_percent}
                      onChange={(e) => setNewItem(updateField(newItem, 'current_percent', parseFloat(e.target.value) || 0))}
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      value={newItem.total_percent}
                      onChange={(e) => setNewItem(updateField(newItem, 'total_percent', parseFloat(e.target.value) || 0))}
                    />
                  </td>
                  <td>
                    <Button onClick={handleSaveNew} size="small" variant="primary">{t('boq_save') || 'Save'}</Button>
                    <Button onClick={handleCancelNew} size="small" variant="secondary">{t('boq_cancel') || 'Cancel'}</Button>
                  </td>
                </tr>
              )}

              {/* Existing Items */}
              {(itemsBySection[section.id] || []).map(item => (
                <tr key={item.id} className={`boq-item-row ${editingItem?.id === item.id ? 'editing' : ''}`}>
                  {editingItem?.id === item.id ? (
                    <>
                      <td>
                        <input
                          type="text"
                          value={editingItem.item_code}
                          onChange={(e) => setEditingItem(updateField(editingItem, 'item_code', e.target.value))}
                        />
                      </td>
                      <td>
                        <input
                          type="text"
                          value={editingItem.description}
                          onChange={(e) => setEditingItem(updateField(editingItem, 'description', e.target.value))}
                        />
                      </td>
                      <td>
                        <input
                          type="text"
                          value={editingItem.unit}
                          onChange={(e) => setEditingItem(updateField(editingItem, 'unit', e.target.value))}
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          value={editingItem.qty}
                          onChange={(e) => setEditingItem(updateField(editingItem, 'qty', parseFloat(e.target.value) || 0))}
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          value={editingItem.rate}
                          onChange={(e) => setEditingItem(updateField(editingItem, 'rate', parseFloat(e.target.value) || 0))}
                        />
                      </td>
                      <td>{formatMoney(editingItem.amount)}</td>
                      <td>
                        <input
                          type="number"
                          value={editingItem.previous_percent}
                          onChange={(e) => setEditingItem(updateField(editingItem, 'previous_percent', parseFloat(e.target.value) || 0))}
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          value={editingItem.current_percent}
                          onChange={(e) => setEditingItem(updateField(editingItem, 'current_percent', parseFloat(e.target.value) || 0))}
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          value={editingItem.total_percent}
                          onChange={(e) => setEditingItem(updateField(editingItem, 'total_percent', parseFloat(e.target.value) || 0))}
                        />
                      </td>
                      <td>
                        <Button onClick={handleSaveEdit} size="small" variant="primary">{t('boq_save') || 'Save'}</Button>
                        <Button onClick={handleCancelEdit} size="small" variant="secondary">{t('boq_cancel') || 'Cancel'}</Button>
                      </td>
                    </>
                  ) : (
                    <>
                      <td>{item.item_code}</td>
                      <td>{item.description}</td>
                      <td>{item.unit}</td>
                      <td>{item.qty}</td>
                      <td>{formatMoney(item.rate)}</td>
                      <td>{formatMoney(item.amount)}</td>
                      <td>{item.previous_percent}%</td>
                      <td>{item.current_percent}%</td>
                      <td>{item.total_percent}%</td>
                      <td>
                        <Button onClick={() => handleEdit(item)} size="small" variant="secondary">{t('boq_edit') || 'Edit'}</Button>
                        <Button onClick={() => handleDelete(item)} size="small" variant="danger">{t('boq_delete') || 'Delete'}</Button>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        );
        })
      ) : (
        <div className="boq-table-empty">
          <p>{t('boq_no_sections') || 'No sections found. Please import data first.'}</p>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        title={t('boq_confirm_delete') || 'Confirm Delete'}
      >
        <p>{t('boq_confirm_delete_message') || 'Are you sure you want to delete this item?'}</p>
        <div className="boq-table__delete-actions">
          <Button onClick={confirmDelete} variant="danger">{t('boq_delete') || 'Delete'}</Button>
          <Button onClick={() => setDeleteConfirm(null)} variant="secondary">{t('boq_cancel') || 'Cancel'}</Button>
        </div>
      </Dialog>
    </div>
  );
}

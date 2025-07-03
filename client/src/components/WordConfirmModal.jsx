import React from 'react';
import '../index.css';

export default function WordConfirmModal({ word, onConfirm, onCancel }) {
  return (
    <div className="modal-backdrop">
      <div className="modal-content" style={{ textAlign: 'center' }}>
        <p style={{ fontFamily: 'Gowun Dodum', fontSize: '16px', marginBottom: '20px' }}>
          입력한 단어 : <strong>{word}</strong>
          <br />
          이 단어로 누군가와 연결을 시도할까요?
        </p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '10px' }}>
          <button className="agree-button" onClick={onCancel}>아니오</button>
          <button className="agree-button" onClick={onConfirm}>예</button>
        </div>
      </div>
    </div>
  );
}
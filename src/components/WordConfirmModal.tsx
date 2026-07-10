import Button from './ui/Button';
import Modal from './ui/Modal';

interface WordConfirmModalProps {
  word: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function WordConfirmModal({ word, onConfirm, onCancel }: WordConfirmModalProps) {
  return (
    <Modal style={{ textAlign: 'center' }}>
      <p style={{ fontFamily: 'Gowun Dodum', fontSize: '16px', marginBottom: '20px' }}>
        입력한 단어 : <strong>{word}</strong>
        <br />
        이 단어로 누군가와 연결을 시도할까요?
      </p>
      <div style={{ display: 'flex', justifyContent: 'center', gap: '10px' }}>
        <Button variant="inline" onClick={onCancel}>아니오</Button>
        <Button variant="inline" onClick={onConfirm}>예</Button>
      </div>
    </Modal>
  );
}

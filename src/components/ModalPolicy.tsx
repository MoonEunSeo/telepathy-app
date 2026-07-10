import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useModal } from '../contexts/ModalContext';
import Button from './ui/Button';
import Modal from './ui/Modal';

interface TermItem {
  id: string;
  label: string;
  required: boolean;
}

const termsList: TermItem[] = [
  { id: 'service', label: '(필수) 서비스 약관 동의', required: true },
  { id: 'privacy', label: '(필수) 개인정보 수집 및 이용 동의', required: true },
  { id: 'youth', label: '(필수) 청소년 보호정책', required: true },
  { id: 'improve', label: '(선택) 서비스 개선 동의', required: false },
  { id: 'alarm', label: '(선택) 알림 수신 동의', required: false },
];

export default function ModalPolicy() {
  const { setIsOpen } = useModal();
  const modalRef = useRef<HTMLDivElement | null>(null);
  const navigate = useNavigate();
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [showAlert, setShowAlert] = useState(false);

  const toggleCheckbox = (id: string) => {
    setChecked((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const agreeAll = () => {
    const newChecked: Record<string, boolean> = {};
    termsList.forEach((term) => (newChecked[term.id] = true));
    setChecked(newChecked);
  };

  const handleNext = () => {
    const allRequiredChecked = termsList.filter((t) => t.required).every((t) => checked[t.id]);
    if (!allRequiredChecked) {
      setShowAlert(true);
      return;
    }
    navigate('/register');
  };

  const handleBackdropClick = (e: MouseEvent) => {
    if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
      setIsOpen(false);
    }
  };

  useEffect(() => {
    document.addEventListener('mousedown', handleBackdropClick);
    return () => {
      document.removeEventListener('mousedown', handleBackdropClick);
    };
  }, []);

  return (
    <Modal ref={modalRef}>
        <h2 style={{ fontFamily: 'Gowun Dodum', fontSize: '22px', fontWeight: 'bold', marginBottom: '16px', textAlign: 'center' }}>
          약관에 동의해주세요
        </h2>
        <ul style={{
                       listStyle: 'none',
                       padding: 0,
                       margin: 0,
                       display: 'flex',
                       flexDirection: 'column',
                       alignItems: 'center', // 리스트 항목들 가운데 정렬
                    }}>
          {termsList.map((term) => (
            <li key={term.id} style={{ marginBottom: '8px', fontFamily: 'Gowun Dodum' }}>
              <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                <input
                  type="checkbox"
                  checked={!!checked[term.id]}
                  onChange={() => toggleCheckbox(term.id)}
                  style={{ marginRight: '8px' }}
                  onClick={(e) => e.stopPropagation()} // ✅ 체크박스 클릭 시 라벨 클릭 방지
                />
                <span
                  onClick={() => navigate(`/terms/${term.id}`)}
                  style={{ textDecoration: 'underline' }}
                >
                  {term.label}
                </span>
              </label>
            </li>
          ))}
        </ul>
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: '20px' }}>
         <Button variant="inline" onClick={agreeAll}>
          전체 동의하기
         </Button>
         <Button variant="inline" onClick={handleNext}>
          다음
         </Button>
        </div>
        {showAlert && (
          <div className="alert-box" style={{ marginTop: '16px', paddingLeft: '50px', paddingRight: '50px' }}>
            모든 필수 약관에 동의하지 않으면{'\n'}서비스를 이용할 수 없습니다.
          </div>
        )}
    </Modal>
  );
}

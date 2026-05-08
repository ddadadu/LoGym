import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import { Upload, CheckCircle2, FileText, AlertCircle } from 'lucide-react';

export default function StoreApprovalRequestPage() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);
  const [gymData, setGymData] = useState(null);
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const fetchUserAndGym = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/login', { replace: true });
        return;
      }
      setCurrentUser(user);

      // Get user's home gym
      const { data: profile } = await supabase
        .from('users')
        .select('home_gym_id, gyms(name, address)')
        .eq('id', user.id)
        .single();

      if (!profile?.home_gym_id) {
        navigate('/store/register', { replace: true });
        return;
      }
      
      setGymData(profile.gyms);
      
      // Check if request already exists
      const { data: managerData } = await supabase
        .from('store_managers')
        .select('status')
        .eq('manager_id', user.id)
        .eq('gym_id', profile.home_gym_id)
        .maybeSingle();
        
      if (managerData) {
          if (managerData.status === 'approved') {
              navigate('/store', { replace: true });
          } else {
              navigate('/store/approval-status', { replace: true });
          }
      }
    };
    
    fetchUserAndGym();
  }, [navigate]);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      if (selectedFile.size > 5 * 1024 * 1024) {
        alert('파일 크기는 5MB 이하여야 합니다.');
        return;
      }
      setFile(selectedFile);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result);
      };
      reader.readAsDataURL(selectedFile);
    }
  };

  const handleSubmit = async () => {
    if (!file) {
      alert('사업자등록증 사본을 업로드해주세요.');
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Upload to Cloudinary
      const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
      const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;
      
      if (!cloudName || !uploadPreset) {
        throw new Error("🚨 .env.local에 VITE_CLOUDINARY_CLOUD_NAME 과 VITE_CLOUDINARY_UPLOAD_PRESET 설정이 누락되었습니다!");
      }

      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', uploadPreset);

      const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
        method: 'POST',
        body: formData
      });
      const clData = await res.json();
      
      if (clData.error) throw new Error("이미지 업로드 실패: " + clData.error.message);
      const uploadedUrl = clData.secure_url;

      // 2. Insert into store_managers
      const { data: profile } = await supabase
        .from('users')
        .select('home_gym_id')
        .eq('id', currentUser.id)
        .single();

      const { error: insertError } = await supabase
        .from('store_managers')
        .upsert({
          manager_id: currentUser.id,
          gym_id: profile.home_gym_id,
          status: 'pending',
          business_registration_url: uploadedUrl,
          requested_at: new Date().toISOString()
        }, { onConflict: 'manager_id, gym_id' });

      if (insertError) throw insertError;

      alert('승인 요청이 완료되었습니다.\n관리자 확인 후 권한이 부여됩니다.');
      navigate('/store/approval-status', { replace: true });
      
    } catch (err) {
      console.error('Submission error:', err);
      alert('승인 요청 중 오류가 발생했습니다: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReselectGym = async () => {
    const confirmCancel = window.confirm('현재 선택된 점포를 취소하고 다른 점포를 검색하시겠습니까?');
    if (!confirmCancel) return;

    try {
      await supabase
        .from('users')
        .update({ home_gym_id: null })
        .eq('id', currentUser.id);

      navigate('/store/register', { replace: true });
    } catch (err) {
      console.error('Reselect gym error:', err);
    }
  };

  return (
    <div className="min-h-[100dvh] flex flex-col bg-[#f7f8fa]">
      <header className="sticky top-0 z-20 flex h-14 items-center justify-center bg-white shadow-sm border-b border-[#e5e8eb]">
        <h1 className="text-[17px] font-bold text-[#191f28]">점포 관리자 권한 승인</h1>
      </header>

      <main className="flex-1 p-5 max-w-lg mx-auto w-full">
        <div className="bg-white rounded-[24px] p-6 shadow-sm border border-[#e5e8eb] mb-6">
          <div className="flex items-center gap-3 mb-4">
             <div className="w-10 h-10 rounded-full bg-[#e8f3ff] flex items-center justify-center">
                <FileText className="w-5 h-5 text-[#3182f6]" />
             </div>
             <div>
                <h2 className="text-[18px] font-extrabold text-[#191f28]">증빙 서류 제출</h2>
                <p className="text-[13px] text-[#8b95a1] mt-0.5">안전한 서비스 운영을 위해 확인 절차가 필요합니다</p>
             </div>
          </div>
          
          <div className="bg-[#f9fafb] p-4 rounded-xl border border-[#f2f4f6] mb-5 flex justify-between items-center">
             <div>
                 <p className="text-[14px] font-bold text-[#4e5968] mb-1">선택된 점포</p>
                 <p className="text-[16px] font-extrabold text-[#191f28]">{gymData?.name}</p>
                 <p className="text-[12px] text-[#8b95a1] mt-1">{gymData?.address}</p>
             </div>
             <button 
                onClick={handleReselectGym}
                className="text-[12px] font-bold text-[#3182f6] bg-[#e8f3ff] px-3 py-2 rounded-lg hover:bg-[#d3e6ff] transition-colors shrink-0"
             >
                 재선택
             </button>
          </div>

          <div className="bg-[#fff4f4] border border-[#ffcdd2] rounded-xl p-4 mb-6">
             <div className="flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-[#f04452] shrink-0 mt-0.5" />
                <div>
                   <h3 className="text-[14px] font-bold text-[#f04452]">사업자등록증 사본 업로드</h3>
                   <p className="text-[12px] text-[#f04452]/80 mt-1 leading-relaxed">
                     본인 확인 및 점포 소유 증명을 위해 사업자등록증 사본을 업로드해 주세요. 제출하신 서류는 최고 관리자 확인 후 즉시 폐기/보안 처리됩니다. (신분증은 업로드하지 마세요)
                   </p>
                </div>
             </div>
          </div>

          <div className="space-y-4">
             <label className="block">
                <span className="text-[14px] font-bold text-[#191f28] mb-2 block">사업자등록증 이미지 첨부</span>
                <div className={`relative flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-2xl transition-colors cursor-pointer ${previewUrl ? 'border-[#3182f6] bg-[#e8f3ff]/50' : 'border-[#d1d6db] bg-[#f9fafb] hover:bg-[#f2f4f6]'}`}>
                   {previewUrl ? (
                      <div className="w-full h-full relative p-2">
                        <img src={previewUrl} alt="미리보기" className="w-full h-full object-contain rounded-xl" />
                        <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 hover:opacity-100 transition-opacity rounded-2xl">
                           <p className="text-white font-bold text-sm">클릭하여 변경</p>
                        </div>
                      </div>
                   ) : (
                      <div className="flex flex-col items-center justify-center pt-5 pb-6 text-[#8b95a1]">
                         <Upload className="w-8 h-8 mb-3 text-[#b0b8c1]" />
                         <p className="text-[14px] font-bold text-[#4e5968] mb-1"><span className="text-[#3182f6]">클릭</span>하여 이미지 선택</p>
                         <p className="text-[12px]">JPG, PNG 형식 지원 (최대 5MB)</p>
                      </div>
                   )}
                   <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
                </div>
             </label>
          </div>
        </div>

        <button 
          onClick={handleSubmit}
          disabled={!file || isSubmitting}
          className="w-full h-14 rounded-2xl bg-[#3182f6] text-white font-bold text-[16px] shadow-lg shadow-[#3182f6]/30 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {isSubmitting ? (
             <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
             <>
               <CheckCircle2 className="w-5 h-5" />
               승인 요청하기
             </>
          )}
        </button>
      </main>
    </div>
  );
}

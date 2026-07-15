import{i as e,m as t,n,p as r,t as i}from"./index-Ciylqu3s.js";/* empty css               */import{t as a}from"./customerService-DeLlM7nT.js";/* empty css                */var o=t(r(),1),s=n(),c=[`Toyota`,`Honda`,`Mazda`,`Hyundai`,`Kia`,`Ford`,`VinFast`,`Mercedes-Benz`,`BMW`,`Audi`,`Lexus`,`Mitsubishi`,`Nissan`,`Isuzu`,`Peugeot`,`Subaru`,`Suzuki`,`Volkswagen`,`Volvo`,`Porsche`,`Khác`],l=[`Sedan`,`SUV`,`MPV`,`Pickup`,`Coupe`,`Convertible`,`Hatchback`,`Wagon`,`Khác`],ee=[`application/pdf`,`image/jpeg`,`image/png`],te=[`.pdf`,`.jpg`,`.jpeg`,`.png`],ne=5,re=10*1024*1024,u=()=>{let{user:t}=i(),[n,r]=(0,o.useState)([]),[u,ie]=(0,o.useState)(!1),[d,f]=(0,o.useState)(`garage`),[ae,oe]=(0,o.useState)([]),[se,p]=(0,o.useState)(!1),[ce,le]=(0,o.useState)(null),[m,h]=(0,o.useState)(null),[ue,de]=(0,o.useState)(!1),[g,fe]=(0,o.useState)(null),[_,pe]=(0,o.useState)(null),[me,he]=(0,o.useState)(!1),[v,y]=(0,o.useState)([]),[b,ge]=(0,o.useState)(!1),[x,_e]=(0,o.useState)(!1),[S,ve]=(0,o.useState)(0),ye=(0,o.useRef)(null),[C,be]=(0,o.useState)(``),[w,xe]=(0,o.useState)(``),[T,Se]=(0,o.useState)(``),[E,Ce]=(0,o.useState)(``),[D,we]=(0,o.useState)(``),[O,Te]=(0,o.useState)(!1),[Ee,De]=(0,o.useState)(``),[Oe,k]=(0,o.useState)(null),[ke,Ae]=(0,o.useState)(!1),[je,A]=(0,o.useState)(null),[j,M]=(0,o.useState)([``,``,``,``,``,``]),[N,P]=(0,o.useState)(0),[F,I]=(0,o.useState)(null),[L,R]=(0,o.useState)(!1),[z,B]=(0,o.useState)(!1),[Me,V]=(0,o.useState)(!1),[Ne,H]=(0,o.useState)(null),[Pe,Fe]=(0,o.useState)(!1),[U,W]=(0,o.useState)([]),[G,Ie]=(0,o.useState)(``),[K,Le]=(0,o.useState)(!1),[q,Re]=(0,o.useState)(0),[ze,J]=(0,o.useState)(``),[Be,Y]=(0,o.useState)(null),[X,Ve]=(0,o.useState)(``),[He,Ue]=(0,o.useState)(``),[We,Ge]=(0,o.useState)(``),[Ke,qe]=(0,o.useState)(``),[Je,Ye]=(0,o.useState)(!1),Xe=(0,o.useRef)(null);(0,o.useEffect)(()=>{let e=null;return N>0&&(e=setInterval(()=>P(e=>e-1),1e3)),()=>clearInterval(e)},[N]),(0,o.useEffect)(()=>{De(j.join(``))},[j]),(0,o.useEffect)(()=>{if(!g){_&&URL.revokeObjectURL(_),pe(null);return}let t=!0;return he(!0),(async()=>{try{let n=await e.get(`/api/admin/ownership-transfers/document/${g.documentId}`,{responseType:`blob`});t&&pe(URL.createObjectURL(n.data))}catch(e){console.error(`Lỗi khi tải tệp xem trước:`,e)}finally{t&&he(!1)}})(),()=>{t=!1}},[g]);let Ze=async t=>{try{let n=await e.get(`/api/admin/ownership-transfers/document/${t.documentId}/download`,{responseType:`blob`}),r=URL.createObjectURL(n.data),i=document.createElement(`a`);i.href=r,i.download=t.fileName,document.body.appendChild(i),i.click(),document.body.removeChild(i),URL.revokeObjectURL(r)}catch(e){console.error(`Lỗi tải xuống:`,e),window.showToast&&window.showToast(`Không thể tải xuống tài liệu này!`,`error`)}},Qe=e=>{if(!e)return``;let[t,n]=e.split(`@`);return t.length<=2?`${t}***@${n}`:`${t.substring(0,2)}***@${n}`},$e=e=>e?e.split(`.`).pop().toUpperCase():``,et=e=>e<1024?e+` B`:e<1048576?(e/1024).toFixed(1)+` KB`:(e/1048576).toFixed(1)+` MB`,tt=e=>e&&e.startsWith(`image/`),nt=async e=>{let t=(e||C).trim().toUpperCase().replace(/[\s\-.]/g,``);if(!(t.length<5)){Fe(!0);try{let e=await a.checkLicensePlate(t);e.success&&(e.exists?e.isOwn?(A(`Bạn đã sở hữu phương tiện này rồi!`),H(`Bạn đã sở hữu phương tiện này rồi!`),B(!1),V(!0)):(H(`Biển số đã được đăng ký. Nếu bạn là chủ sở hữu mới, vui lòng gửi yêu cầu chuyển quyền.`),B(!0),V(!1),A(null)):(H(null),B(!1),V(!1),A(null)),R(!0))}catch(e){console.error(e)}finally{Fe(!1)}}};(0,o.useEffect)(()=>{let e=C.trim().toUpperCase().replace(/[\s\-.]/g,``);if(e.length<5){H(null),B(!1),V(!1),R(!1),A(null);return}let t=setTimeout(()=>{nt(e)},450);return()=>clearTimeout(t)},[C]);let Z=(0,o.useCallback)(async(e=!1)=>{e||ie(!0);try{let t=await a.getVehicles(e?{skipGlobalLoader:!0}:{});t.success&&r(t.vehicles)}catch(e){console.error(e),r([])}finally{e||ie(!1)}},[]),Q=(0,o.useCallback)(async(e=!1)=>{e||p(!0);try{let t=await a.getMyTransferRequests(e?{skipGlobalLoader:!0}:{});t.success&&oe(t.requests)}catch(e){console.error(e)}finally{e||p(!1)}},[]);(0,o.useEffect)(()=>{Z(),Q();let e=setInterval(()=>{Z(!0),Q(!0)},5e3);return()=>clearInterval(e)},[Z,Q]);let rt=e=>e.trim().toUpperCase().replace(/[\s\-.]/g,``),it=(e,t)=>{let n=e.value.replace(/\D/g,``);if(!n){let e=[...j];e[t]=``,M(e);return}let r=n[n.length-1],i=[...j];i[t]=r,M(i),r&&e.nextElementSibling&&e.nextElementSibling.focus(),F&&I(null)},at=(e,t)=>{if(e.key===`Backspace`){if(!j[t]&&e.target.previousElementSibling){e.target.previousElementSibling.focus();let n=[...j];n[t-1]=``,M(n)}else{let e=[...j];e[t]=``,M(e)}F&&I(null)}},ot=e=>{e.preventDefault();let t=e.clipboardData.getData(`text`).replace(/\D/g,``).slice(0,6);if(t.length===6){M(t.split(``));let n=e.target.parentNode.querySelectorAll(`.otp-box`);n&&n.length>0&&n[n.length-1].focus(),F&&I(null)}},st=async()=>{let e=rt(C),n=w===`Khác`?T.trim():w;if(!e){window.showToast&&window.showToast(`Biển số không hợp lệ.`,`warning`);return}if(!n){window.showToast&&window.showToast(`Vui lòng chọn hãng xe.`,`warning`);return}if(!E.trim()){window.showToast&&window.showToast(`Vui lòng nhập dòng xe.`,`warning`);return}if(!D){window.showToast&&window.showToast(`Vui lòng chọn phân khúc.`,`warning`);return}k(`sending`),I(null);try{(await a.sendVehicleOtp(e,n,E.trim(),D)).success&&(k(`sent`),Te(!0),P(45),M([``,``,``,``,``,``]),window.showToast&&window.showToast(`Mã OTP đã được gửi tới ${Qe(t?.email)}`,`success`))}catch(e){k(`failed`);let t=e.response?.data?.message||`Gửi OTP thất bại!`;e.response?.status===409&&(B(!0),H(`Biển số đã tồn tại.`)),window.showToast&&window.showToast(t,`error`)}},ct=async()=>{if(Ee.length<6){I(`Vui lòng nhập mã OTP.`);return}let e=rt(C),t=w===`Khác`?T.trim():w;Ae(!0),I(null);try{(await a.verifyVehicleOtpAndSave(e,t,E.trim(),D,Ee)).success&&(window.showToast&&window.showToast(`Đăng ký phương tiện thành công.`,`success`),wt(),Z())}catch{I(`Mã OTP không chính xác.`)}finally{Ae(!1)}},lt=(e,t=0)=>{if(e.length+t>ne)return`Tổng số lượng tài liệu tối đa là ${ne} tệp.`;for(let t of e){if(t.size>re)return`Tệp '${t.name}' vượt quá 10MB.`;let e=`.`+t.name.split(`.`).pop().toLowerCase();if(!te.includes(e))return`Chỉ chấp nhận PDF, JPG, JPEG, PNG. Tệp '${t.name}' không hợp lệ.`;if(!ee.includes(t.type))return`MIME type của tệp '${t.name}' không hợp lệ.`}return null},ut=e=>{let t=Array.from(e.target.files),n=lt(t,0);if(n){window.showToast&&window.showToast(n,`error`),e.target.value=``;return}W(e=>[...e,...t]),J(``)},dt=e=>{e.preventDefault(),e.stopPropagation(),e.type===`dragenter`||e.type===`dragover`?Ye(!0):e.type===`dragleave`&&Ye(!1)},ft=e=>{if(e.preventDefault(),e.stopPropagation(),Ye(!1),e.dataTransfer.files&&e.dataTransfer.files[0]){let t=Array.from(e.dataTransfer.files),n=lt(t,0);if(n){window.showToast&&window.showToast(n,`error`);return}W(e=>[...e,...t]),J(``)}},pt=()=>{Xe.current.click()},mt=e=>{W(t=>t.filter((t,n)=>n!==e)),J(``)},ht=async()=>{if(U.length===0){window.showToast&&window.showToast(`Vui lòng tải lên ít nhất một tài liệu chứng minh quyền sở hữu.`,`warning`);return}if(!G.trim()){window.showToast&&window.showToast(`Vui lòng nhập lý do chuyển quyền sở hữu.`,`warning`);return}let e=rt(C);Le(!0),Re(0),J(``);try{let t=new FormData;if(t.append(`licensePlate`,e),G.trim()&&t.append(`description`,G.trim()),U.forEach(e=>t.append(`files`,e)),(await a.submitTransferRequest(t,{onUploadProgress:e=>{Re(Math.round(e.loaded*100/e.total))}})).success){J(`Tải tệp thành công.`),window.showToast&&window.showToast(`Đã gửi yêu cầu chuyển quyền thành công.`,`success`),wt(),p(!0);try{let e=await a.getMyTransferRequests();e.success&&(oe(e.requests),e.requests&&e.requests.length>0&&(le(e.requests[0].requestId),setTimeout(()=>{le(null)},5e3)))}catch(e){console.error(e)}finally{p(!1)}f(`transfers`)}}catch(e){let t=e.response?.data?.message||`Có lỗi xảy ra!`;window.showToast&&window.showToast(t,`error`)}finally{Le(!1)}},gt=async e=>{de(!0);try{let t=await a.getOwnershipTransferDetail(e);t.success&&(h(t.request),y([]))}catch(e){console.error(e),window.showToast&&window.showToast(`Không thể tải chi tiết yêu cầu chuyển quyền!`,`error`)}finally{de(!1)}},_t=e=>{if(x)return;let t=async()=>{_e(!0);try{(await a.cancelTransferRequest(e)).success&&(window.showToast&&window.showToast(`✔ Đã hủy`,`success`),h(null),Q())}catch(e){window.showToast&&window.showToast(e.response?.data?.message||`Không thể xử lý yêu cầu.`,`error`)}finally{_e(!1)}};window.showConfirm?window.showConfirm(`Bạn có chắc chắn muốn hủy yêu cầu chuyển nhượng này?`,t):window.confirm(`Bạn có chắc chắn muốn hủy yêu cầu chuyển nhượng này?`)&&t()},vt=e=>{let t=Array.from(e.target.files),n=lt(t,m?.documents?.length||0);if(n){window.showToast&&window.showToast(n,`error`),e.target.value=``;return}y(e=>[...e,...t])},yt=e=>{y(t=>t.filter((t,n)=>n!==e))},bt=async()=>{if(v.length===0){window.showToast&&window.showToast(`Vui lòng chọn tài liệu để bổ sung!`,`warning`);return}ge(!0),ve(0);try{let e=new FormData;v.forEach(t=>e.append(`files`,t)),(await a.uploadAdditionalDocuments(m.requestId,e,{onUploadProgress:e=>{ve(Math.round(e.loaded*100/e.total))}})).success&&(window.showToast&&window.showToast(`Bổ sung tài liệu thành công.`,`success`),y([]),await gt(m.requestId),Q(!0))}catch(e){console.error(e),window.showToast&&window.showToast(e.response?.data?.message||`Có lỗi xảy ra khi tải tài liệu lên!`,`error`)}finally{ge(!1)}},xt=e=>{Y(e);let t=c.includes(e.brand);Ve(t?e.brand:`Khác`),Ue(t?``:e.brand),Ge(e.model),qe(e.vehicleClass)},St=async()=>{let e=X===`Khác`?He.trim():X;if(!e){window.showToast&&window.showToast(`Vui lòng chọn hãng xe.`,`warning`);return}if(!We.trim()){window.showToast&&window.showToast(`Vui lòng nhập dòng xe.`,`warning`);return}if(!Ke){window.showToast&&window.showToast(`Vui lòng chọn phân khúc.`,`warning`);return}try{(await a.editVehicle(Be.vehicleId,e,We.trim(),Ke)).success&&(window.showToast&&window.showToast(`Đăng ký thành công.`,`success`),Y(null),Z())}catch(e){window.showToast&&window.showToast(e.response?.data?.message||`Có lỗi xảy ra!`,`error`)}},Ct=e=>{window.showConfirm?window.showConfirm(`Bạn có chắc chắn muốn xóa phương tiện này?`,async()=>{try{(await a.deleteVehicle(e)).success&&(window.showToast&&window.showToast(`Đã xóa!`,`success`),Z())}catch(e){window.showToast&&window.showToast(e.response?.data?.message||`Không thể xóa!`,`error`)}}):window.confirm(`Bạn có chắc chắn muốn xóa phương tiện này?`)&&(async()=>{try{(await a.deleteVehicle(e)).success&&(alert(`Đã xóa!`),Z())}catch(e){alert(e.response?.data?.message||`Không thể xóa!`)}})()},wt=()=>{be(``),xe(``),Se(``),Ce(``),we(``),Te(!1),De(``),M([``,``,``,``,``,``]),P(0),k(null),A(null),B(!1),V(!1),H(null),R(!1),W([]),Ie(``),Fe(!1),I(null),Re(0),J(``)},Tt=e=>{switch(e){case`Pending`:return(0,s.jsx)(`span`,{className:`badge bg-warning text-dark`,children:`Chờ duyệt`});case`Approved`:return(0,s.jsx)(`span`,{className:`badge bg-success`,children:`Đã duyệt`});case`Rejected`:return(0,s.jsx)(`span`,{className:`badge bg-danger`,children:`Từ chối`});case`Cancelled`:return(0,s.jsx)(`span`,{className:`badge bg-secondary`,children:`Đã hủy`});default:return(0,s.jsx)(`span`,{className:`badge bg-secondary`,children:e})}},$=e=>e?new Date(e).toLocaleString(`vi-VN`,{day:`2-digit`,month:`2-digit`,year:`numeric`,hour:`2-digit`,minute:`2-digit`}):`—`,Et=K||U.length===0||!G.trim();return(0,s.jsxs)(`div`,{className:`container py-4`,children:[(0,s.jsx)(`style`,{children:`
        .custom-card-v2 {
          background: #ffffff;
          border-radius: 16px;
          border: 1px solid #e2e8f0;
          box-shadow: 0 10px 30px rgba(15, 23, 42, 0.04), 0 1px 3px rgba(15, 23, 42, 0.02);
          padding: 24px;
          margin-bottom: 24px;
        }
        .vehicle-item-row-v2 {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 14px 18px;
          border: 1px solid #f1f5f9;
          border-radius: 12px;
          background-color: #ffffff;
          transition: all 0.2s;
          margin-bottom: 12px;
        }
        .vehicle-item-row-v2:hover {
          background-color: #f8fafc;
          box-shadow: 0 4px 12px rgba(15, 23, 42, 0.03);
        }
        .vehicle-icon-box-v2 {
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          background-color: #ffffff;
          border: 1px solid #e2e8f0;
          width: 44px;
          height: 44px;
          flex-shrink: 0;
        }
        .app-btn-blue-v2 {
          background-color: #008ecf;
          border-color: #008ecf;
          color: #ffffff;
          font-weight: 700;
          padding: 10px 20px;
          border-radius: 8px;
          font-size: 0.9rem;
          transition: all 0.2s;
          border-style: solid;
        }
        .app-btn-blue-v2:hover {
          background-color: #0077b0;
          border-color: #0077b0;
          color: #ffffff;
        }
        .app-btn-orange-v2 {
          background-color: #f97316;
          border-color: #f97316;
          color: #ffffff;
          font-weight: 700;
          padding: 10px 20px;
          border-radius: 8px;
          font-size: 0.9rem;
          transition: all 0.2s;
          border-style: solid;
        }
        .app-btn-orange-v2:hover {
          background-color: #ea580c;
          border-color: #ea580c;
          color: #ffffff;
        }
        .tab-btn-v2 {
          border-radius: 8px;
          font-weight: 700;
          font-size: 0.85rem;
          padding: 8px 20px;
          border: none;
          transition: all 0.2s;
        }
        .tab-btn-v2.active {
          background-color: #2563eb !important;
          color: #ffffff !important;
        }
        .tab-btn-v2.inactive {
          background-color: #e2e8f0;
          color: #475569;
        }
        .tab-btn-v2.inactive:hover {
          background-color: #cbd5e1;
        }
        .action-icon-box {
          width: 32px;
          height: 32px;
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid #cbd5e1;
          background: #ffffff;
          transition: all 0.15s;
        }
        .action-icon-box.edit:hover {
          border-color: #2563eb;
          color: #2563eb;
          background: #eff6ff;
        }
        .action-icon-box.delete:hover {
          border-color: #dc2626;
          color: #dc2626;
          background: #fef2f2;
        }
        .status-panel-v2 {
          border-radius: 8px;
          padding: 12px 16px;
          border-left: 4px solid transparent;
        }
        .status-panel-v2.warning {
          background-color: #fffbeb;
          border-left-color: #d97706;
        }
        .dashed-upload-box {
          border: 2px dashed #cbd5e1;
          border-radius: 10px;
          padding: 24px 20px;
          text-align: center;
          background-color: #f8fafc;
          cursor: pointer;
          transition: all 0.2s;
        }
        .dashed-upload-box:hover, .dashed-upload-box.drag-active {
          border-color: #2563eb;
          background-color: #f0f5ff;
        }
        .divider-v2 {
          border-top: 1px solid #e2e8f0;
          margin: 20px 0;
        }
        .input-label-v2 {
          font-size: 13px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: #64748b;
        }
        .helper-text-v2 {
          font-size: 12px;
          color: #64748b;
        }
        .validation-text-v2 {
          font-size: 12px;
          color: #dc2626;
        }
        .status-text-v2 {
          font-size: 13px;
        }
        .otp-box-container {
          display: flex;
          justify-content: center;
          gap: 10px;
          margin-top: 14px;
          margin-bottom: 14px;
        }
        .otp-box {
          width: 48px;
          height: 48px;
          border-radius: 8px;
          border: 1px solid #cbd5e1;
          font-size: 22px;
          font-weight: bold;
          text-align: center;
          background-color: #ffffff;
          transition: border-color 0.15s, box-shadow 0.15s;
        }
        .otp-box:focus {
          border-color: #008ecf;
          box-shadow: 0 0 0 3px rgba(0, 142, 207, 0.15);
          outline: none;
        }
        .clickable-documents-badge {
          cursor: pointer;
          transition: opacity 0.15s;
        }
        .clickable-documents-badge:hover {
          opacity: 0.8;
        }
      `}),(0,s.jsxs)(`div`,{className:`d-flex justify-content-between align-items-center mb-4`,children:[(0,s.jsx)(`h4`,{className:`fw-bold mb-0 text-slate-800`,style:{fontFamily:`Be Vietnam Pro, sans-serif`},children:`Phương tiện của tôi`}),(0,s.jsxs)(`div`,{className:`d-flex gap-2`,children:[(0,s.jsx)(`button`,{className:`tab-btn-v2 ${d===`garage`?`active`:`inactive`}`,onClick:()=>f(`garage`),children:`Garage phương tiện`}),(0,s.jsx)(`button`,{className:`tab-btn-v2 ${d===`transfers`?`active`:`inactive`}`,onClick:()=>{f(`transfers`),Q()},children:`Yêu cầu chuyển quyền`})]})]}),d===`garage`&&(0,s.jsx)(`div`,{className:`row justify-content-center`,children:(0,s.jsxs)(`div`,{className:`col-12`,children:[(0,s.jsxs)(`div`,{className:`custom-card-v2`,children:[(0,s.jsx)(`h5`,{className:`fw-bold mb-4 text-start text-dark d-flex align-items-center`,style:{fontSize:`18px`,fontFamily:`Be Vietnam Pro, sans-serif`},children:`GARAGE PHƯƠNG TIỆN ĐÃ ĐĂNG KÝ`}),(0,s.jsx)(`div`,{className:`mb-2`,children:u?(0,s.jsxs)(`div`,{className:`text-center py-4`,children:[(0,s.jsx)(`div`,{className:`spinner-border text-primary spinner-border-sm`,role:`status`}),(0,s.jsx)(`p`,{className:`text-muted mt-2 small`,children:`Đang tải danh sách xe...`})]}):n.length===0?(0,s.jsxs)(`div`,{className:`text-center py-5 text-muted small bg-light rounded-4 border border-dashed`,children:[(0,s.jsx)(`i`,{className:`fas fa-car-side fa-2x mb-3 text-secondary`,style:{opacity:.5}}),(0,s.jsx)(`div`,{children:`Chưa có phương tiện nào được đăng ký. Hãy đăng ký xe đầu tiên để bắt đầu đặt lịch!`})]}):n.map((e,t)=>(0,s.jsxs)(`div`,{className:`vehicle-item-row-v2`,children:[(0,s.jsxs)(`div`,{className:`d-flex align-items-center gap-3`,children:[(0,s.jsx)(`div`,{className:`vehicle-icon-box-v2`,children:(0,s.jsx)(`i`,{className:`fas fa-car text-muted`,style:{fontSize:`1.1rem`}})}),(0,s.jsxs)(`div`,{className:`text-start`,children:[(0,s.jsxs)(`div`,{className:`fw-bold`,style:{color:`var(--navy-dark)`,fontSize:`0.98rem`},children:[`🚗 `,e.brand,` `,e.model]}),(0,s.jsxs)(`div`,{className:`text-muted small mt-1`,children:[(0,s.jsxs)(`span`,{className:`me-3`,children:[`Biển số: `,(0,s.jsx)(`strong`,{children:e.licensePlate})]}),(0,s.jsxs)(`span`,{className:`me-3`,children:[`Loại xe: `,e.vehicleClass]}),e.registeredAt&&(0,s.jsxs)(`span`,{children:[`Ngày đăng ký: `,new Date(e.registeredAt).toLocaleDateString(`vi-VN`)]})]})]})]}),(0,s.jsxs)(`div`,{className:`d-flex gap-2`,children:[(0,s.jsx)(`button`,{className:`btn p-0 action-icon-box edit`,onClick:()=>xt(e),title:`Sửa`,children:(0,s.jsx)(`i`,{className:`fas fa-pencil-alt`,style:{fontSize:`0.9rem`}})}),(0,s.jsx)(`button`,{className:`btn p-0 action-icon-box delete`,onClick:()=>Ct(e.vehicleId),title:`Xóa`,disabled:e.hasActiveBooking,children:(0,s.jsx)(`i`,{className:`fas fa-trash-alt`,style:{fontSize:`0.9rem`}})})]})]},e.vehicleId||t))})]}),(0,s.jsxs)(`div`,{className:`custom-card-v2`,children:[(0,s.jsx)(`h5`,{className:`fw-bold mb-4 text-start text-dark d-flex align-items-center`,style:{fontSize:`18px`,fontFamily:`Be Vietnam Pro, sans-serif`},children:L&&z?`Yêu cầu chuyển quyền sở hữu`:`Đăng ký phương tiện mới`}),(0,s.jsxs)(`div`,{className:`mb-3 text-start`,children:[(0,s.jsx)(`label`,{className:`form-label input-label-v2 mb-1`,children:`Biển số xe *`}),(0,s.jsxs)(`div`,{className:`position-relative`,children:[(0,s.jsx)(`input`,{type:`text`,className:`form-control form-control-custom`,placeholder:`Ví dụ: 51H-888.88`,value:C,onChange:e=>{be(e.target.value),R(!1)},disabled:O,style:{height:`44px`}}),Pe&&(0,s.jsx)(`div`,{className:`position-absolute end-0 top-50 translate-middle-y me-3`,children:(0,s.jsx)(`span`,{className:`spinner-border spinner-border-sm text-info`,role:`status`})})]}),L&&!z&&!Me&&(0,s.jsx)(`div`,{className:`status-text-v2 mt-2 text-start text-success`,style:{fontWeight:`500`,fontSize:`13px`},children:`✓ Biển số khả dụng.`}),Pe&&!L&&(0,s.jsx)(`div`,{className:`status-text-v2 mt-2 text-start text-muted`,style:{fontSize:`12px`},children:`Đang kiểm tra biển số...`}),!L&&!Pe&&(0,s.jsx)(`small`,{className:`helper-text-v2 mt-1.5 d-block`,children:`Nhập biển số để kiểm tra xem xe đã được đăng ký hay chưa.`})]}),L&&(0,s.jsxs)(`div`,{className:`animate-fade`,children:[(0,s.jsx)(`div`,{className:`divider-v2`}),!z&&!Me&&(0,s.jsxs)(`div`,{children:[O&&(0,s.jsx)(`div`,{className:`text-end mb-3`,children:(0,s.jsx)(`button`,{type:`button`,className:`btn btn-link p-0 text-decoration-none small`,style:{fontSize:`13px`,color:`#008ecf`,fontWeight:`600`},onClick:()=>{Te(!1),M([``,``,``,``,``,``]),I(null)},children:`Chỉnh sửa thông tin`})}),(0,s.jsxs)(`div`,{className:`row g-3 text-start`,children:[(0,s.jsxs)(`div`,{className:`col-md-4`,children:[(0,s.jsx)(`label`,{className:`form-label input-label-v2 mb-1`,children:`Hãng xe *`}),(0,s.jsxs)(`select`,{className:`form-select form-select-custom`,value:w,onChange:e=>xe(e.target.value),disabled:O,children:[(0,s.jsx)(`option`,{value:``,children:`-- Chọn hãng xe --`}),c.map(e=>(0,s.jsx)(`option`,{value:e,children:e},e))]}),w===`Khác`&&(0,s.jsx)(`input`,{type:`text`,className:`form-control form-control-custom mt-2`,placeholder:`Nhập hãng xe`,value:T,onChange:e=>Se(e.target.value),disabled:O})]}),(0,s.jsxs)(`div`,{className:`col-md-4`,children:[(0,s.jsx)(`label`,{className:`form-label input-label-v2 mb-1`,children:`Dòng xe *`}),(0,s.jsx)(`input`,{type:`text`,className:`form-control form-control-custom`,placeholder:`Ví dụ: Vios, CX5...`,value:E,onChange:e=>Ce(e.target.value),disabled:O})]}),(0,s.jsxs)(`div`,{className:`col-md-4`,children:[(0,s.jsx)(`label`,{className:`form-label input-label-v2 mb-1`,children:`Phân khúc *`}),(0,s.jsxs)(`select`,{className:`form-select form-select-custom`,value:D,onChange:e=>we(e.target.value),disabled:O,children:[(0,s.jsx)(`option`,{value:``,children:`-- Chọn phân khúc --`}),l.map(e=>(0,s.jsx)(`option`,{value:e,children:e},e))]})]})]}),(0,s.jsx)(`div`,{className:`mt-4`,children:O?(0,s.jsxs)(`div`,{className:`card border-0 bg-white p-4 rounded-3 text-center shadow-sm`,style:{maxWidth:`420px`,margin:`0 auto`},children:[(0,s.jsx)(`h6`,{className:`fw-bold mb-2 text-dark`,style:{fontSize:`16px`},children:`Xác thực email`}),(0,s.jsxs)(`p`,{className:`text-muted small mb-3`,children:[`Mã OTP đã được gửi đến `,(0,s.jsx)(`strong`,{children:Qe(t?.email)})]}),(0,s.jsx)(`div`,{className:`otp-box-container`,children:j.map((e,t)=>(0,s.jsx)(`input`,{type:`text`,className:`otp-box`,value:e,maxLength:1,onChange:e=>it(e.target,t),onKeyDown:e=>at(e,t),onPaste:ot},t))}),F&&(0,s.jsx)(`div`,{className:`validation-text-v2 text-danger text-center mt-1 mb-3`,style:{fontWeight:`500`},children:F}),(0,s.jsxs)(`div`,{className:`d-flex flex-column gap-2 w-100`,children:[(0,s.jsx)(`button`,{className:`app-btn-blue-v2 w-100 py-2.5`,onClick:ct,disabled:ke||Ee.length<6,children:ke?`ĐANG XÁC THỰC...`:`XÁC THỰC & ĐĂNG KÝ`}),(0,s.jsxs)(`div`,{className:`text-center mt-3`,style:{fontSize:`13px`},children:[(0,s.jsx)(`span`,{className:`text-muted`,children:`Không nhận được mã? `}),N>0?(0,s.jsxs)(`span`,{className:`text-muted fw-bold`,children:[`Gửi lại sau `,N,` giây`]}):(0,s.jsx)(`button`,{type:`button`,className:`btn btn-link p-0 text-decoration-none fw-bold`,style:{color:`#008ecf`,fontSize:`13px`},onClick:st,children:`Gửi lại mã OTP`})]})]})]}):(0,s.jsx)(`button`,{className:`app-btn-blue-v2 w-100`,onClick:st,disabled:Oe===`sending`||!w||!E.trim()||!D,style:{height:`44px`},children:Oe===`sending`?`ĐANG GỬI MÃ...`:`GỬI MÃ XÁC THỰC (OTP)`})})]}),z&&(0,s.jsxs)(`div`,{className:`text-start animate-fade`,children:[(0,s.jsxs)(`div`,{className:`status-panel-v2 warning mb-3`,style:{backgroundColor:`#fffbeb`,borderLeft:`4px solid #d97706`,padding:`12px 16px`,borderRadius:`8px`},children:[(0,s.jsx)(`div`,{className:`fw-bold mb-1`,style:{fontSize:`13px`,color:`#d97706`},children:`Biển số đã được đăng ký.`}),(0,s.jsx)(`div`,{className:`text-muted small`,style:{fontSize:`12px`,color:`#475569`,lineHeight:`1.4`},children:`Nếu bạn là chủ sở hữu mới, vui lòng gửi yêu cầu chuyển quyền.`})]}),(0,s.jsxs)(`div`,{className:`row g-3`,children:[(0,s.jsxs)(`div`,{className:`col-md-6`,children:[(0,s.jsx)(`label`,{className:`form-label input-label-v2 mb-1`,children:`Giấy tờ chuyển quyền *`}),(0,s.jsxs)(`div`,{className:`dashed-upload-box mb-2`,onDragEnter:dt,onDragOver:dt,onDragLeave:dt,onDrop:ft,onClick:K?void 0:pt,style:{border:`2px dashed #cbd5e1`,borderRadius:`10px`,padding:`20px`,backgroundColor:`#f8fafc`,cursor:K?`not-allowed`:`pointer`,opacity:K?.6:1},children:[U.length===0?(0,s.jsxs)(`div`,{className:`text-center`,children:[(0,s.jsx)(`div`,{className:`fs-3 mb-2`,children:`📄`}),(0,s.jsx)(`div`,{className:`fw-bold small text-slate-700`,children:`Kéo và thả tệp vào đây`}),(0,s.jsxs)(`div`,{className:`text-muted small`,children:[`hoặc `,(0,s.jsx)(`span`,{className:`text-primary text-decoration-underline`,children:`Chọn tệp`})]}),(0,s.jsxs)(`div`,{className:`text-muted mt-2`,style:{fontSize:`11px`},children:[`Định dạng hỗ trợ: PDF • JPG • JPEG • PNG`,(0,s.jsx)(`br`,{}),`Tối đa: 5 tệp (10 MB mỗi tệp)`]})]}):(0,s.jsxs)(`div`,{children:[(0,s.jsxs)(`div`,{className:`d-flex align-items-center justify-content-between mb-3 px-1`,children:[(0,s.jsxs)(`span`,{className:`fw-bold small text-slate-700`,style:{fontSize:`13px`},children:[`Đã tải lên `,U.length,` tệp`]}),!K&&(0,s.jsx)(`button`,{type:`button`,className:`btn btn-link p-0 text-decoration-underline small fw-semibold text-primary`,onClick:e=>{e.stopPropagation(),pt()},children:`Chọn thêm tệp`})]}),(0,s.jsxs)(`div`,{className:`text-start`,children:[U.map((e,t)=>(0,s.jsxs)(`div`,{children:[(0,s.jsx)(`hr`,{className:`my-2`,style:{borderColor:`#cbd5e1`}}),(0,s.jsxs)(`div`,{className:`d-flex justify-content-between align-items-center py-1`,children:[(0,s.jsxs)(`div`,{className:`text-truncate me-2`,children:[(0,s.jsxs)(`div`,{className:`fw-semibold text-slate-800 text-truncate`,style:{fontSize:`13px`},children:[`📄 `,e.name]}),(0,s.jsxs)(`div`,{className:`text-muted`,style:{fontSize:`11px`},children:[$e(e.name),` • `,(e.size/1024/1024).toFixed(2),` MB`]})]}),!K&&(0,s.jsx)(`button`,{type:`button`,className:`btn btn-link text-danger p-0 text-decoration-none small fw-bold`,onClick:e=>{e.stopPropagation(),mt(t)},children:`Xóa`})]})]},t)),(0,s.jsx)(`hr`,{className:`my-2`,style:{borderColor:`#cbd5e1`}})]})]}),K&&q>0&&(0,s.jsxs)(`div`,{className:`mt-2 text-start`,children:[(0,s.jsxs)(`div`,{className:`d-flex justify-content-between mb-1 small text-muted`,style:{fontSize:`11px`},children:[(0,s.jsx)(`span`,{children:`Đang tải lên tài liệu...`}),(0,s.jsxs)(`span`,{children:[q,`%`]})]}),(0,s.jsx)(`div`,{className:`progress`,style:{height:`5px`},children:(0,s.jsx)(`div`,{className:`progress-bar progress-bar-striped progress-bar-animated bg-success`,role:`progressbar`,style:{width:`${q}%`},"aria-valuenow":q,"aria-valuemin":`0`,"aria-valuemax":`100`})})]}),(0,s.jsx)(`input`,{type:`file`,ref:Xe,className:`d-none`,multiple:!0,accept:`.pdf,.jpg,.jpeg,.png`,onChange:ut,disabled:K})]}),U.length===0&&(0,s.jsx)(`div`,{className:`text-muted small mb-3 text-start`,style:{fontSize:`12px`},children:`Chưa có tài liệu nào được tải lên.`}),ze&&(0,s.jsx)(`div`,{className:`text-success small mt-1 text-start`,style:{fontWeight:`500`,fontSize:`12px`},children:ze})]}),(0,s.jsxs)(`div`,{className:`col-md-6`,children:[(0,s.jsx)(`label`,{className:`form-label input-label-v2 mb-1`,children:`Lý do chuyển quyền *`}),(0,s.jsx)(`textarea`,{className:`form-control form-control-custom`,rows:4,placeholder:`Ví dụ: Tôi đã mua lại chiếc xe này và đính kèm hợp đồng mua bán để xác minh quyền sở hữu.`,value:G,onChange:e=>Ie(e.target.value),disabled:K,style:{resize:`none`,height:`170px`}})]})]}),(0,s.jsx)(`div`,{className:`mt-3`,children:(0,s.jsx)(`button`,{className:`btn app-btn-orange-v2 w-100`,onClick:ht,disabled:Et,style:{height:`44px`},children:K?(0,s.jsxs)(s.Fragment,{children:[(0,s.jsx)(`span`,{className:`spinner-border spinner-border-sm me-2`,role:`status`,"aria-hidden":`true`}),`Đang gửi...`]}):`Gửi yêu cầu chuyển quyền`})})]}),Me&&Ne&&(0,s.jsx)(`div`,{className:`alert alert-info py-2.5 px-3 border-0 rounded-3 mb-0 text-start`,children:(0,s.jsx)(`span`,{className:`small`,children:Ne})})]})]})]})}),d===`transfers`&&(0,s.jsxs)(`div`,{className:`custom-card-v2`,children:[(0,s.jsx)(`h5`,{className:`fw-bold mb-4 text-start text-dark d-flex align-items-center`,style:{fontSize:`18px`,fontFamily:`Be Vietnam Pro, sans-serif`},children:`YÊU CẦU CHUYỂN QUYỀN SỞ HỮU`}),se?(0,s.jsxs)(`div`,{className:`text-center py-5`,children:[(0,s.jsx)(`div`,{className:`spinner-border text-primary spinner-border-sm`,role:`status`}),(0,s.jsx)(`p`,{className:`text-muted mt-2 small`,children:`Đang tải lịch sử...`})]}):ae.length===0?(0,s.jsxs)(`div`,{className:`text-center py-5 text-muted small bg-light rounded-4 border border-dashed`,children:[(0,s.jsx)(`div`,{style:{fontSize:`2.5rem`,marginBottom:`10px`},children:`📄`}),(0,s.jsx)(`div`,{children:`Bạn chưa có yêu cầu chuyển quyền nào.`})]}):(0,s.jsx)(`div`,{className:`table-responsive`,children:(0,s.jsxs)(`table`,{className:`table align-middle text-start mb-0`,children:[(0,s.jsx)(`thead`,{className:`table-light`,children:(0,s.jsxs)(`tr`,{className:`small text-uppercase text-muted`,style:{fontSize:`0.75rem`,letterSpacing:`0.05em`},children:[(0,s.jsx)(`th`,{className:`py-3 px-3`,children:`Biển số`}),(0,s.jsx)(`th`,{className:`py-3`,children:`Ngày gửi`}),(0,s.jsx)(`th`,{className:`py-3`,children:`Trạng thái`}),(0,s.jsx)(`th`,{className:`py-3`,children:`Tài liệu`}),(0,s.jsx)(`th`,{className:`py-3 text-center`,children:`Hành động`})]})}),(0,s.jsx)(`tbody`,{children:ae.map(e=>(0,s.jsxs)(`tr`,{style:{borderBottom:`1px solid #f1f5f9`,backgroundColor:ce===e.requestId?`#eff6ff`:`transparent`,transition:`background-color 1s ease`},children:[(0,s.jsx)(`td`,{className:`py-3 px-3`,children:(0,s.jsx)(`span`,{className:`badge bg-dark font-monospace px-2.5 py-1.5`,style:{fontSize:`0.85rem`},children:e.vehiclePlate})}),(0,s.jsx)(`td`,{className:`py-3 small text-slate-600`,children:$(e.submittedAt)}),(0,s.jsx)(`td`,{className:`py-3`,children:Tt(e.status)}),(0,s.jsx)(`td`,{className:`py-3`,children:(0,s.jsxs)(`span`,{className:`badge bg-info text-white clickable-documents-badge px-2 py-1.5`,onClick:()=>gt(e.requestId),title:`Click để xem chi tiết tài liệu`,children:[e.documentCount||0,` tài liệu`]})}),(0,s.jsx)(`td`,{className:`py-3 text-center`,children:(0,s.jsxs)(`div`,{className:`d-flex gap-2 justify-content-center`,children:[(0,s.jsx)(`button`,{className:`btn btn-sm btn-outline-primary px-3 rounded-2 fw-semibold`,onClick:()=>gt(e.requestId),children:`Chi tiết`}),e.status===`Pending`&&(0,s.jsx)(`button`,{className:`btn btn-sm btn-outline-danger px-3 rounded-2 fw-semibold`,onClick:()=>_t(e.requestId),disabled:x,children:`Hủy`})]})})]},e.requestId))})]})})]}),m&&(0,s.jsx)(`div`,{className:`modal show d-block`,style:{backgroundColor:`rgba(15, 23, 42, 0.6)`,backdropFilter:`blur(4px)`,zIndex:1050},onClick:()=>h(null),children:(0,s.jsx)(`div`,{className:`modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable`,onClick:e=>e.stopPropagation(),children:(0,s.jsxs)(`div`,{className:`modal-content border-0 shadow-lg rounded-4 overflow-hidden bg-white`,children:[(0,s.jsxs)(`div`,{className:`modal-header border-0 bg-light p-3 px-4 d-flex justify-content-between align-items-center`,children:[(0,s.jsx)(`h6`,{className:`modal-title fw-bold m-0`,style:{color:`var(--navy-dark)`},children:`CHI TIẾT YÊU CẦU CHUYỂN QUYỀN`}),(0,s.jsx)(`button`,{type:`button`,className:`btn-close shadow-none`,onClick:()=>h(null)})]}),(0,s.jsx)(`div`,{className:`modal-body p-4 text-start`,children:ue?(0,s.jsx)(`div`,{className:`text-center py-5`,children:(0,s.jsx)(`div`,{className:`spinner-border text-primary`,role:`status`})}):(0,s.jsxs)(`div`,{className:`row g-4`,children:[(0,s.jsxs)(`div`,{className:`col-md-7`,children:[(0,s.jsxs)(`div`,{className:`card border border-slate-100 rounded-3 p-3 mb-3 bg-light`,children:[(0,s.jsx)(`h6`,{className:`fw-bold mb-2 text-slate-700`,style:{fontSize:`0.85rem`,textTransform:`uppercase`},children:`🚗 Phương tiện`}),(0,s.jsxs)(`div`,{className:`d-flex align-items-center gap-2`,children:[(0,s.jsx)(`span`,{className:`badge bg-dark font-monospace px-2.5 py-1.5`,style:{fontSize:`0.9rem`},children:m.vehiclePlate}),(0,s.jsxs)(`span`,{className:`text-slate-700 fw-bold`,children:[m.brand,` `,m.model]})]}),(0,s.jsxs)(`div`,{className:`text-muted small mt-2`,children:[`Phân khúc: `,m.vehicleClass]})]}),(0,s.jsxs)(`div`,{className:`card border border-slate-100 rounded-3 p-3 mb-3`,children:[(0,s.jsx)(`h6`,{className:`fw-bold mb-3 text-slate-700`,style:{fontSize:`0.85rem`,textTransform:`uppercase`},children:`📝 Thông tin yêu cầu`}),(0,s.jsxs)(`div`,{className:`mb-2`,children:[(0,s.jsx)(`strong`,{children:`Trạng thái: `}),` `,Tt(m.status)]}),(0,s.jsxs)(`div`,{className:`mb-2 small text-muted`,children:[(0,s.jsx)(`strong`,{children:`Ngày gửi: `}),` `,$(m.submittedAt)]}),m.description&&(0,s.jsxs)(`div`,{className:`mb-2 text-slate-700`,style:{fontSize:`0.9rem`},children:[(0,s.jsx)(`strong`,{children:`Lý do: `}),` `,m.description]}),m.status===`Approved`&&(0,s.jsxs)(`div`,{className:`alert alert-success py-2.5 mt-3 mb-0`,style:{fontSize:`13px`},children:[(0,s.jsxs)(`div`,{children:[(0,s.jsx)(`strong`,{children:`✓ Trạng thái:`}),` Đã phê duyệt`]}),m.reviewedAt&&(0,s.jsxs)(`div`,{children:[(0,s.jsx)(`strong`,{children:`✓ Ngày phê duyệt:`}),` `,$(m.reviewedAt)]}),m.reviewedByName&&(0,s.jsxs)(`div`,{children:[(0,s.jsx)(`strong`,{children:`✓ Người phê duyệt:`}),` `,m.reviewedByName]}),(0,s.jsx)(`div`,{className:`mt-1 text-success fw-bold`,children:`✓ Xe đã được chuyển sang chủ mới.`})]}),m.status===`Rejected`&&(0,s.jsxs)(`div`,{className:`alert alert-danger py-2.5 mt-3 mb-0`,style:{fontSize:`13px`},children:[(0,s.jsxs)(`div`,{children:[(0,s.jsx)(`strong`,{children:`Trạng thái:`}),` Bị từ chối`]}),m.rejectReason&&(0,s.jsxs)(`div`,{children:[(0,s.jsx)(`strong`,{children:`Lý do từ chối:`}),` `,m.rejectReason]}),m.reviewedAt&&(0,s.jsxs)(`div`,{children:[(0,s.jsx)(`strong`,{children:`Ngày xử lý:`}),` `,$(m.reviewedAt)]})]}),m.status===`Cancelled`&&(0,s.jsxs)(`div`,{className:`alert alert-secondary py-2.5 mt-3 mb-0`,style:{fontSize:`13px`},children:[(0,s.jsxs)(`div`,{children:[(0,s.jsx)(`strong`,{children:`Trạng thái:`}),` Đã hủy`]}),(0,s.jsx)(`div`,{className:`text-secondary fw-bold`,children:`Đã hủy bởi khách hàng.`}),m.reviewedAt&&(0,s.jsxs)(`div`,{children:[(0,s.jsx)(`strong`,{children:`Ngày hủy:`}),` `,$(m.reviewedAt)]})]})]}),(0,s.jsxs)(`div`,{className:`card border border-slate-100 rounded-3 p-3`,children:[(0,s.jsx)(`h6`,{className:`fw-bold mb-3 text-slate-700`,style:{fontSize:`0.85rem`,textTransform:`uppercase`},children:`🕒 Tiến độ yêu cầu`}),((e,t,n,r,i)=>{let a=e===`Pending`,o=e===`Approved`,c=e===`Rejected`,l=e===`Cancelled`;return(0,s.jsxs)(`div`,{className:`timeline-container-v2 text-start mt-3`,children:[(0,s.jsx)(`style`,{children:`
          .timeline-v2 {
            position: relative;
            padding-left: 30px;
            margin-bottom: 0;
          }
          .timeline-v2::before {
            content: '';
            position: absolute;
            left: 11px;
            top: 5px;
            bottom: 5px;
            width: 2px;
            background-color: #cbd5e1;
            z-index: 1;
          }
          .timeline-item-v2 {
            position: relative;
            margin-bottom: 20px;
          }
          .timeline-item-v2:last-child {
            margin-bottom: 0;
          }
          .timeline-dot-v2 {
            position: absolute;
            left: -30px;
            top: 3px;
            width: 24px;
            height: 24px;
            border-radius: 50%;
            background-color: #ffffff;
            border: 2px solid #cbd5e1;
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 2;
          }
          .timeline-dot-v2.completed {
            border-color: #22c55e;
            background-color: #22c55e;
            color: #ffffff;
          }
          .timeline-dot-v2.active {
            border-color: #0ea5e9;
            background-color: #f0f9ff;
            color: #0ea5e9;
          }
          .timeline-dot-v2.cancelled {
            border-color: #64748b;
            background-color: #64748b;
            color: #ffffff;
          }
          .timeline-dot-v2.rejected {
            border-color: #ef4444;
            background-color: #ef4444;
            color: #ffffff;
          }
          .timeline-title-v2 {
            font-size: 0.88rem;
            font-weight: 700;
            color: #1e293b;
          }
          .timeline-desc-v2 {
            font-size: 0.8rem;
            color: #64748b;
            margin-top: 2px;
          }
          .timeline-time-v2 {
            font-size: 0.72rem;
            color: #94a3b8;
            margin-top: 2px;
          }
        `}),(0,s.jsxs)(`div`,{className:`timeline-v2`,children:[(0,s.jsxs)(`div`,{className:`timeline-item-v2`,children:[(0,s.jsx)(`div`,{className:`timeline-dot-v2 completed`,children:(0,s.jsx)(`i`,{className:`fas fa-paper-plane`,style:{fontSize:`0.65rem`}})}),(0,s.jsxs)(`div`,{children:[(0,s.jsx)(`div`,{className:`timeline-title-v2`,children:`📝 Đã gửi yêu cầu (Submitted)`}),(0,s.jsx)(`div`,{className:`timeline-desc-v2`,children:`Yêu cầu chuyển quyền sở hữu xe đã được khởi tạo thành công và gửi lên hệ thống.`}),(0,s.jsx)(`div`,{className:`timeline-time-v2`,children:$(t)})]})]}),(0,s.jsxs)(`div`,{className:`timeline-item-v2`,children:[(0,s.jsx)(`div`,{className:`timeline-dot-v2 ${a?`active`:`completed`}`,children:a?(0,s.jsx)(`span`,{className:`spinner-border spinner-border-sm text-info`,style:{width:`10px`,height:`10px`,borderWidth:`1.5px`}}):(0,s.jsx)(`i`,{className:`fas fa-search`,style:{fontSize:`0.65rem`}})}),(0,s.jsxs)(`div`,{children:[(0,s.jsx)(`div`,{className:`timeline-title-v2`,children:`🔍 Đang kiểm tra (Under Review)`}),(0,s.jsx)(`div`,{className:`timeline-desc-v2`,children:a?`Ban quản trị đang xem xét tài liệu, đối chiếu biển số và xác thực thông tin đăng ký xe.`:`Review completed. Quá trình kiểm tra hồ sơ và giấy tờ đăng ký xe đã hoàn tất.`}),(0,s.jsx)(`div`,{className:`timeline-time-v2`,children:a?`Đang xử lý...`:$(n)})]})]}),!a&&(0,s.jsxs)(`div`,{className:`timeline-item-v2`,children:[(0,s.jsx)(`div`,{className:`timeline-dot-v2 ${o?`completed`:c?`rejected`:`cancelled`}`,children:o?(0,s.jsx)(`i`,{className:`fas fa-check`,style:{fontSize:`0.65rem`}}):c?(0,s.jsx)(`i`,{className:`fas fa-times`,style:{fontSize:`0.65rem`}}):(0,s.jsx)(`i`,{className:`fas fa-ban`,style:{fontSize:`0.65rem`}})}),(0,s.jsxs)(`div`,{children:[(0,s.jsx)(`div`,{className:`timeline-title-v2`,children:o?`🎉 Đã duyệt (Approved)`:c?`❌ Đã từ chối (Rejected)`:`🚫 Đã hủy (Cancelled)`}),(0,s.jsxs)(`div`,{className:`timeline-desc-v2`,children:[o&&(i?`Yêu cầu chuyển quyền được phê duyệt bởi ${i}. Xe đã được chuyển sang chủ mới.`:`Yêu cầu chuyển nhượng đã được phê duyệt. Xe đã được chuyển sang chủ sở hữu mới.`),c&&`Ban quản trị đã từ chối yêu cầu chuyển quyền này. Lý do: ${r||`Không có lý do cụ thể.`}`,l&&`Yêu cầu chuyển quyền đã được hủy bỏ bởi khách hàng.`]}),(0,s.jsx)(`div`,{className:`timeline-time-v2`,children:$(n)})]})]})]})]})})(m.status,m.submittedAt,m.reviewedAt,m.rejectReason,m.reviewedByName)]})]}),(0,s.jsx)(`div`,{className:`col-md-5`,children:(0,s.jsxs)(`div`,{className:`card border border-slate-100 rounded-3 p-3 h-100 d-flex flex-column`,children:[(0,s.jsxs)(`h6`,{className:`fw-bold mb-3 text-slate-700`,style:{fontSize:`0.85rem`,textTransform:`uppercase`},children:[`📄 Tài liệu đính kèm (`,m.documents?.length||0,`)`]}),(0,s.jsx)(`div`,{className:`flex-grow-1 overflow-auto mb-3`,style:{maxHeight:`280px`},children:m.documents&&m.documents.length>0?(0,s.jsx)(`div`,{className:`list-group list-group-flush border-bottom`,children:m.documents.map(e=>(0,s.jsxs)(`div`,{className:`list-group-item px-0 py-2 d-flex justify-content-between align-items-center`,children:[(0,s.jsxs)(`div`,{className:`text-truncate me-2`,style:{maxWidth:`70%`},children:[(0,s.jsxs)(`div`,{className:`fw-semibold text-slate-800 text-truncate`,style:{fontSize:`12px`},children:[(0,s.jsx)(`i`,{className:`fas ${tt(e.contentType)?`fa-image text-success`:`fa-file-pdf text-danger`} me-1.5`}),e.fileName]}),(0,s.jsxs)(`div`,{className:`text-muted`,style:{fontSize:`10px`},children:[$e(e.fileName),` • `,et(e.fileSize)]})]}),(0,s.jsxs)(`div`,{className:`d-flex gap-1`,children:[(0,s.jsx)(`button`,{type:`button`,className:`btn btn-sm btn-light p-1 px-2 text-slate-600 rounded`,title:`Xem trước`,onClick:()=>fe(e),children:(0,s.jsx)(`i`,{className:`fas fa-eye`,style:{fontSize:`0.8rem`}})}),(0,s.jsx)(`button`,{type:`button`,className:`btn btn-sm btn-light p-1 px-2 text-slate-600 rounded`,title:`Tải xuống`,onClick:()=>Ze(e),children:(0,s.jsx)(`i`,{className:`fas fa-download`,style:{fontSize:`0.8rem`}})})]})]},e.documentId))}):(0,s.jsx)(`div`,{className:`text-center text-muted py-4 small`,children:`Chưa có tài liệu đính kèm.`})}),m.status===`Pending`&&(0,s.jsxs)(`div`,{className:`border-top pt-3 mt-auto`,children:[(0,s.jsx)(`h6`,{className:`fw-bold mb-2 text-slate-600`,style:{fontSize:`0.8rem`},children:`Bổ sung tài liệu`}),(0,s.jsx)(`div`,{className:`mb-2`,children:(0,s.jsx)(`input`,{type:`file`,ref:ye,className:`form-control form-control-sm`,accept:`.pdf,.jpg,.jpeg,.png`,multiple:!0,onChange:vt,disabled:b,style:{fontSize:`12px`}})}),v.length>0&&(0,s.jsx)(`div`,{className:`border rounded p-2 bg-light mb-2`,style:{maxHeight:`110px`,overflowY:`auto`},children:v.map((e,t)=>(0,s.jsxs)(`div`,{className:`d-flex justify-content-between align-items-center py-1 border-bottom last-border-0`,style:{fontSize:`11px`},children:[(0,s.jsxs)(`span`,{className:`text-truncate text-slate-700 me-2`,style:{maxWidth:`80%`},children:[`📄 `,e.name]}),(0,s.jsx)(`button`,{type:`button`,className:`btn btn-link p-0 text-danger text-decoration-none font-weight-bold`,onClick:()=>yt(t),disabled:b,children:`Xóa`})]},t))}),b&&(0,s.jsxs)(`div`,{className:`mb-2`,children:[(0,s.jsxs)(`div`,{className:`d-flex justify-content-between mb-1 small text-muted`,style:{fontSize:`10px`},children:[(0,s.jsx)(`span`,{children:`Đang tải lên...`}),(0,s.jsxs)(`span`,{children:[S,`%`]})]}),(0,s.jsx)(`div`,{className:`progress`,style:{height:`4px`},children:(0,s.jsx)(`div`,{className:`progress-bar bg-info progress-bar-striped progress-bar-animated`,role:`progressbar`,style:{width:`${S}%`},"aria-valuenow":S,"aria-valuemin":`0`,"aria-valuemax":`100`})})]}),(0,s.jsx)(`button`,{type:`button`,className:`btn btn-sm app-btn-blue-v2 w-100`,onClick:bt,disabled:b||v.length===0,style:{padding:`6px 12px`,fontSize:`12px`,height:`auto`},children:b?`ĐANG TẢI LÊN...`:`LƯU BỔ SUNG`})]})]})})]})}),(0,s.jsxs)(`div`,{className:`modal-footer border-0 p-3 px-4 bg-light d-flex justify-content-end gap-2`,children:[m&&m.status===`Pending`&&!ue&&(0,s.jsx)(`button`,{type:`button`,className:`btn btn-outline-danger py-2 px-4 rounded-3 text-sm fw-bold border-1`,onClick:()=>_t(m.requestId),disabled:x,children:x?(0,s.jsxs)(s.Fragment,{children:[(0,s.jsx)(`span`,{className:`spinner-border spinner-border-sm me-1`,role:`status`,"aria-hidden":`true`}),`ĐANG HỦY...`]}):`HỦY YÊU CẦU`}),(0,s.jsx)(`button`,{type:`button`,className:`btn btn-secondary py-2 px-4 rounded-3 text-sm fw-bold border-0`,style:{backgroundColor:`#e2e8f0`,color:`#475569`},onClick:()=>h(null),children:`ĐÓNG`})]})]})})}),g&&(0,s.jsx)(`div`,{className:`modal d-block`,style:{backgroundColor:`rgba(15, 23, 42, 0.8)`,zIndex:1060},onClick:()=>fe(null),children:(0,s.jsx)(`div`,{className:`modal-dialog modal-xl modal-dialog-centered`,onClick:e=>e.stopPropagation(),children:(0,s.jsxs)(`div`,{className:`modal-content border-0 shadow-lg rounded-4 bg-white overflow-hidden`,children:[(0,s.jsxs)(`div`,{className:`modal-header bg-light border-0 p-3 px-4 d-flex justify-content-between align-items-center`,children:[(0,s.jsxs)(`h6`,{className:`modal-title fw-bold m-0 text-slate-800`,children:[(0,s.jsx)(`i`,{className:`fas fa-file me-2 text-info`}),g.fileName]}),(0,s.jsx)(`button`,{type:`button`,className:`btn-close`,onClick:()=>fe(null)})]}),(0,s.jsx)(`div`,{className:`modal-body text-center p-4`,style:{minHeight:`400px`,backgroundColor:`#0f172a`,display:`flex`,alignItems:`center`,justifyContent:`center`},children:me?(0,s.jsx)(`div`,{className:`spinner-border text-info`,role:`status`,children:(0,s.jsx)(`span`,{className:`visually-hidden`,children:`Đang tải...`})}):_?tt(g.contentType)?(0,s.jsx)(`img`,{src:_,alt:g.fileName,style:{maxWidth:`100%`,maxHeight:`70vh`,objectFit:`contain`,borderRadius:`8px`}}):(0,s.jsx)(`iframe`,{src:_,title:g.fileName,style:{width:`100%`,height:`70vh`,border:`none`,borderRadius:`8px`}}):(0,s.jsx)(`div`,{className:`text-white small`,children:`Không thể hiển thị tài liệu này.`})})]})})}),Be&&(0,s.jsx)(`div`,{className:`modal show d-block`,style:{backgroundColor:`rgba(15, 23, 42, 0.6)`,backdropFilter:`blur(4px)`,zIndex:1050},children:(0,s.jsx)(`div`,{className:`modal-dialog modal-dialog-centered`,children:(0,s.jsxs)(`div`,{className:`modal-content border-0 shadow-lg rounded-4 overflow-hidden bg-white`,children:[(0,s.jsxs)(`div`,{className:`modal-header border-0 bg-light p-3 px-4 d-flex justify-content-between align-items-center`,children:[(0,s.jsx)(`h6`,{className:`modal-title fw-bold m-0`,style:{color:`var(--navy-dark)`},children:`CHỈNH SỬA PHƯƠNG TIỆN`}),(0,s.jsx)(`button`,{type:`button`,className:`btn-close shadow-none`,onClick:()=>Y(null)})]}),(0,s.jsxs)(`div`,{className:`modal-body p-4 text-start`,children:[(0,s.jsxs)(`div`,{className:`mb-3`,children:[(0,s.jsx)(`label`,{className:`form-label small fw-bold text-muted`,children:`BIỂN SỐ XE`}),(0,s.jsx)(`input`,{type:`text`,className:`form-control py-2.5 font-monospace uppercase fw-bold bg-light`,value:Be.licensePlate,disabled:!0,readOnly:!0}),(0,s.jsx)(`small`,{className:`text-muted mt-1 d-block text-secondary`,style:{fontSize:`0.75rem`},children:`Biển số xe không được phép thay đổi.`})]}),(0,s.jsxs)(`div`,{className:`mb-3`,children:[(0,s.jsx)(`label`,{className:`form-label small fw-bold text-muted`,children:`HÃNG XE *`}),(0,s.jsxs)(`select`,{className:`form-select py-2.5`,value:X,onChange:e=>{Ve(e.target.value),e.target.value!==`Khác`&&Ue(``)},children:[(0,s.jsx)(`option`,{value:``,children:`-- Chọn hãng xe --`}),c.map(e=>(0,s.jsx)(`option`,{value:e,children:e},e))]})]}),X===`Khác`&&(0,s.jsxs)(`div`,{className:`mb-3 animate-up`,children:[(0,s.jsx)(`label`,{className:`form-label small fw-bold text-muted`,children:`NHẬP HÃNG XE *`}),(0,s.jsx)(`input`,{type:`text`,className:`form-control py-2.5`,placeholder:`Ví dụ: Rolls-Royce`,value:He,onChange:e=>Ue(e.target.value)})]}),(0,s.jsxs)(`div`,{className:`mb-3`,children:[(0,s.jsx)(`label`,{className:`form-label small fw-bold text-muted`,children:`MODEL XE *`}),(0,s.jsx)(`input`,{type:`text`,className:`form-control py-2.5`,placeholder:`Ví dụ: Vios, CX5, Ghost`,value:We,onChange:e=>Ge(e.target.value)})]}),(0,s.jsxs)(`div`,{className:`mb-3`,children:[(0,s.jsx)(`label`,{className:`form-label small fw-bold text-muted`,children:`LOẠI XE *`}),(0,s.jsxs)(`select`,{className:`form-select py-2.5`,value:Ke,onChange:e=>qe(e.target.value),children:[(0,s.jsx)(`option`,{value:``,children:`-- Chọn loại xe --`}),l.map(e=>(0,s.jsx)(`option`,{value:e,children:e},e))]})]})]}),(0,s.jsxs)(`div`,{className:`modal-footer border-0 p-3 px-4 bg-light d-flex gap-2`,children:[(0,s.jsx)(`button`,{type:`button`,className:`btn btn-secondary py-2 px-4 rounded-3 text-sm fw-bold border-0`,style:{backgroundColor:`#e2e8f0`,color:`#475569`},onClick:()=>Y(null),children:`HỦY BỎ`}),(0,s.jsx)(`button`,{type:`button`,className:`app-btn-primary py-2 px-4 text-dark fw-bold m-0`,style:{backgroundColor:`#008ecf`,color:`#ffffff`},onClick:St,disabled:u,children:u?`ĐANG LƯU...`:`CẬP NHẬT`})]})]})})})]})};export{u as CustomerVehicles,u as default};
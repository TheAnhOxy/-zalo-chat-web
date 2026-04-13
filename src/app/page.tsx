export default function TestTailwind() {
  return (
    <div className="min-h-screen bg-chat-bg dark:bg-chat-bg-dark flex flex-col items-center justify-center p-4 transition-colors duration-500">
      
      {/* Test Card */}
      <div className="max-w-md w-full bg-white dark:bg-chat-bubble-dark shadow-xl rounded-2xl p-6 space-y-4 animate-message-in">
        
        {/* Test Custom Color (Zalo Blue) */}
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 bg-zalo-blue rounded-full flex items-center justify-center text-white font-bold shadow-lg">
            ZA
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-800 dark:text-white">
              Tailwind Test
            </h2>
            <p className="text-sm text-green-500 animate-pulse">● Online</p>
          </div>
        </div>

        {/* Test Typography & Border */}
        <div className="border-t border-gray-100 dark:border-gray-700 pt-4">
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
            Nếu bạn thấy nút màu xanh Zalo, font chữ bo tròn và hiệu ứng "nhảy" nhẹ khi load trang, thì Tailwind đã chạy ngon!
          </p>
        </div>

        {/* Test Responsive & Interaction */}
        <div className="grid grid-cols-2 gap-3">
          <button className="bg-zalo-blue hover:bg-zalo-dark text-white py-2 px-4 rounded-lg transition-all active:scale-95">
            Gửi tin nhắn
          </button>
          <button className="bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 py-2 px-4 rounded-lg hover:opacity-80">
            Hủy bỏ
          </button>
        </div>

        {/* Test Aspect Ratio (Nếu đã cài plugin) */}
        <div className="aspect-video bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center text-gray-400 italic">
          Hình ảnh giả lập (Aspect Ratio)
        </div>
      </div>

      <p className="mt-8 text-sm text-gray-400 italic">
        Thử đổi sang Dark Mode trên trình duyệt để xem màu nền thay đổi nhé!
      </p>
    </div>
  );
}
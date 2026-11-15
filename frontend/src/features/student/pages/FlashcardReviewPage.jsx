import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  Trophy,
  BookOpen,
  Layers,
  Search,
  CheckSquare,
  Square,
  Check,
  X,
  ArrowLeft,
  ArrowRight,
  RotateCcw,
  Volume2,
  Sparkles,
  Shuffle,
  CheckCircle2,
  Filter,
  Lightbulb,
  PlayCircle,
} from 'lucide-react'
import { useFlashcards } from '@student/hooks/useFlashcards.js'
import * as flashcardsApi from '@student/api/flashcards.js'
import * as coursesApi from '@shared/api/courses.js'
import * as contentItemsApi from '@shared/api/contentItems.js'
import FlashcardCard from '@shared/components/FlashcardCard.jsx'
import { resolveMediaUrl } from '@config/media.js'
import anhOnTapImg from '@/assets/banners/anhOnTap.png'

// DANH SÁCH BỘ TỪ VỰNG CHUẨN TOEIC THEO CHỦ ĐỀ
const CURATED_VOCAB_LISTS = [
  {
    id: 'CURATED_CONTRACTS',
    title: 'Hợp đồng & Đàm phán (Contracts & Negotiations)',
    description: '12 từ vựng cốt lõi thường xuyên xuất hiện trong TOEIC Part 3, 4, 7 về giao kèo, cam kết.',
    category: 'TOPIC',
    badge: 'Chủ đề TOEIC',
    words: [
      {
        id: 'c1',
        word: 'abide by',
        ipa: "/ə'baɪd baɪ/",
        partOfSpeech: 'verb',
        meaningVi: 'tuân theo, tôn trọng (hợp đồng, quyết định)',
        examples: [{ sentenceEn: 'Both parties agreed to abide by the terms of the agreement.', sentenceVi: 'Cả hai bên đã đồng ý tuân thủ các điều khoản của thỏa thuận.' }],
      },
      {
        id: 'c2',
        word: 'agreement',
        ipa: "/ə'ɡriːmənt/",
        partOfSpeech: 'noun',
        meaningVi: 'hợp đồng, thỏa thuận, hiệp định',
        examples: [{ sentenceEn: 'According to the agreement, the payment is due next month.', sentenceVi: 'Theo thỏa thuận, khoản thanh toán sẽ đến hạn vào tháng tới.' }],
      },
      {
        id: 'c3',
        word: 'assurance',
        ipa: "/ə'ʃʊərəns/",
        partOfSpeech: 'noun',
        meaningVi: 'sự bảo đảm, sự cam đoan chắc chắn',
        examples: [{ sentenceEn: 'The supplier gave assurances that quality would not be compromised.', sentenceVi: 'Nhà cung cấp đã đưa ra những cam đoan rằng chất lượng sẽ không bị ảnh hưởng.' }],
      },
      {
        id: 'c4',
        word: 'cancellation',
        ipa: "/ˌkænsə'leɪʃn/",
        partOfSpeech: 'noun',
        meaningVi: 'sự hủy bỏ, bãi bỏ hợp đồng',
        examples: [{ sentenceEn: 'The cancellation clause states that notice must be given 30 days in advance.', sentenceVi: 'Điều khoản hủy bỏ nêu rõ cần phải thông báo trước 30 ngày.' }],
      },
      {
        id: 'c5',
        word: 'determine',
        ipa: "/dɪ'tɜːmɪn/",
        partOfSpeech: 'verb',
        meaningVi: 'xác định, định đoạt, quyết định',
        examples: [{ sentenceEn: 'After reading the contract, I was still unable to determine our legal liabilities.', sentenceVi: 'Sau khi đọc hợp đồng, tôi vẫn chưa thể xác định được trách nhiệm pháp lý của chúng tôi.' }],
      },
      {
        id: 'c6',
        word: 'engage',
        ipa: "/ɪn'ɡeɪdʒ/",
        partOfSpeech: 'verb',
        meaningVi: 'cam kết, ràng buộc, tham gia',
        examples: [{ sentenceEn: 'The company engaged in negotiations with several potential investors.', sentenceVi: 'Công ty đã tham gia đàm phán với một số nhà đầu tư tiềm năng.' }],
      },
      {
        id: 'c7',
        word: 'establish',
        ipa: "/ɪ'stæblɪʃ/",
        partOfSpeech: 'verb',
        meaningVi: 'thiết lập, xác lập, chứng minh',
        examples: [{ sentenceEn: 'We hope to establish a long-term business partnership.', sentenceVi: 'Chúng tôi hy vọng sẽ thiết lập quan hệ đối tác kinh doanh lâu dài.' }],
      },
      {
        id: 'c8',
        word: 'obligate',
        ipa: "/'ɒblɪɡeɪt/",
        partOfSpeech: 'verb',
        meaningVi: 'bắt buộc, ép buộc về mặt pháp lý',
        examples: [{ sentenceEn: 'The contract obligates the firm to complete the project on time.', sentenceVi: 'Hợp đồng bắt buộc công ty phải hoàn thành dự án đúng hạn.' }],
      },
      {
        id: 'c9',
        word: 'party',
        ipa: "/'pɑːti/",
        partOfSpeech: 'noun',
        meaningVi: 'bên tham gia (hợp đồng, đàm phán)',
        examples: [{ sentenceEn: 'The contract was signed by representatives of both parties.', sentenceVi: 'Hợp đồng đã được ký bởi đại diện của cả hai bên.' }],
      },
      {
        id: 'c10',
        word: 'provision',
        ipa: "/prə'vɪʒn/",
        partOfSpeech: 'noun',
        meaningVi: 'điều khoản, điều kiện giao kèo',
        examples: [{ sentenceEn: 'The contract contains special provisions for overtime work.', sentenceVi: 'Hợp đồng chứa đựng các điều khoản đặc biệt cho việc làm thêm giờ.' }],
      },
      {
        id: 'c11',
        word: 'resolve',
        ipa: "/rɪ'zɒlv/",
        partOfSpeech: 'verb',
        meaningVi: 'giải quyết, xử lý (tranh chấp, mâu thuẫn)',
        examples: [{ sentenceEn: 'Both sides agreed to resolve their differences through arbitration.', sentenceVi: 'Cả hai bên đã đồng ý giải quyết bất đồng thông qua trọng tài.' }],
      },
      {
        id: 'c12',
        word: 'specific',
        ipa: "/spə'sɪfɪk/",
        partOfSpeech: 'adj',
        meaningVi: 'cụ thể, rành mạch, chi tiết',
        examples: [{ sentenceEn: 'The agreement outlines specific goals for the next quarter.', sentenceVi: 'Thỏa thuận vạch ra những mục tiêu cụ thể cho quý tiếp theo.' }],
      },
    ],
  },
  {
    id: 'CURATED_MARKETING',
    title: 'Tiếp thị & Khách hàng (Marketing & Sales)',
    description: '10 từ vựng trọng tâm về quảng bá sản phẩm, thấu hiểu người tiêu dùng và thị trường.',
    category: 'TOPIC',
    badge: 'Chủ đề TOEIC',
    words: [
      {
        id: 'm1',
        word: 'attract',
        ipa: "/ə'trækt/",
        partOfSpeech: 'verb',
        meaningVi: 'thu hút, lôi cuốn khách hàng',
        examples: [{ sentenceEn: 'The new advertising campaign aims to attract younger customers.', sentenceVi: 'Chiến dịch quảng cáo mới nhằm thu hút khách hàng trẻ tuổi hơn.' }],
      },
      {
        id: 'm2',
        word: 'compare',
        ipa: "/kəm'peə/",
        partOfSpeech: 'verb',
        meaningVi: 'so sánh, đối chiếu giá cả/chất lượng',
        examples: [{ sentenceEn: 'Consumers often compare prices online before making a purchase.', sentenceVi: 'Người tiêu dùng thường so sánh giá trực tuyến trước khi mua hàng.' }],
      },
      {
        id: 'm3',
        word: 'competition',
        ipa: "/ˌkɒmpə'tɪʃn/",
        partOfSpeech: 'noun',
        meaningVi: 'sự cạnh tranh, đối thủ cạnh tranh',
        examples: [{ sentenceEn: 'Fierce competition in the market led to significant price reductions.', sentenceVi: 'Sự cạnh tranh khốc liệt trên thị trường đã dẫn đến việc giảm giá đáng kể.' }],
      },
      {
        id: 'm4',
        word: 'consume',
        ipa: "/kən'sjuːm/",
        partOfSpeech: 'verb',
        meaningVi: 'tiêu thụ, tiêu dùng',
        examples: [{ sentenceEn: 'People consume more energy drinks during busy work seasons.', sentenceVi: 'Mọi người tiêu thụ nhiều nước tăng lực hơn trong các mùa làm việc bận rộn.' }],
      },
      {
        id: 'm5',
        word: 'convince',
        ipa: "/kən'vɪns/",
        partOfSpeech: 'verb',
        meaningVi: 'thuyết phục, làm cho tin',
        examples: [{ sentenceEn: 'The salesman convinced the client of the product reliability.', sentenceVi: 'Người bán hàng đã thuyết phục khách hàng về độ tin cậy của sản phẩm.' }],
      },
      {
        id: 'm6',
        word: 'currently',
        ipa: "/'kʌrəntli/",
        partOfSpeech: 'adv',
        meaningVi: 'hiện thời, hiện nay',
        examples: [{ sentenceEn: 'We are currently developing a mobile app for our services.', sentenceVi: 'Chúng tôi hiện đang phát triển ứng dụng di động cho các dịch vụ của mình.' }],
      },
      {
        id: 'm7',
        word: 'fad',
        ipa: '/fæd/',
        partOfSpeech: 'noun',
        meaningVi: 'mốt nhất thời, xu hướng ngắn ngủi',
        examples: [{ sentenceEn: 'Diet fads come and go, but healthy habits last.', sentenceVi: 'Các mốt ăn kiêng đến rồi đi, nhưng thói quen lành mạnh thì lâu dài.' }],
      },
      {
        id: 'm8',
        word: 'inspiration',
        ipa: "/ˌɪnspə'reɪʃn/",
        partOfSpeech: 'noun',
        meaningVi: 'nguồn cảm hứng sáng tạo',
        examples: [{ sentenceEn: 'The creative team drew inspiration from nature for the logo design.', sentenceVi: 'Đội ngũ sáng tạo đã lấy cảm hứng từ thiên nhiên để thiết kế logo.' }],
      },
      {
        id: 'm9',
        word: 'market',
        ipa: "/'mɑːkɪt/",
        partOfSpeech: 'noun/verb',
        meaningVi: 'thị trường, tiếp thị sản phẩm',
        examples: [{ sentenceEn: 'They plan to market their new software globally.', sentenceVi: 'Họ dự định tiếp thị phần mềm mới của mình trên toàn cầu.' }],
      },
      {
        id: 'm10',
        word: 'satisfaction',
        ipa: "/ˌsætɪs'fækʃn/",
        partOfSpeech: 'noun',
        meaningVi: 'sự thỏa mãn, sự hài lòng của khách hàng',
        examples: [{ sentenceEn: 'Customer satisfaction is our top priority.', sentenceVi: 'Sự hài lòng của khách hàng là ưu tiên hàng đầu của chúng tôi.' }],
      },
    ],
  },
  {
    id: 'CURATED_FINANCE',
    title: 'Tài chính & Ngân sách (Finance & Budgeting)',
    description: '10 từ vựng then chốt trong báo cáo tài chính, quản lý chi phí doanh nghiệp.',
    category: 'TOPIC',
    badge: 'Chủ đề TOEIC',
    words: [
      {
        id: 'f1',
        word: 'accounting',
        ipa: "/ə'kaʊntɪŋ/",
        partOfSpeech: 'noun',
        meaningVi: 'ngành kế toán, sự ghi chép sổ sách kế toán',
        examples: [{ sentenceEn: 'She has ten years of experience in corporate accounting.', sentenceVi: 'Cô ấy có mười năm kinh nghiệm trong lĩnh vực kế toán doanh nghiệp.' }],
      },
      {
        id: 'f2',
        word: 'accumulate',
        ipa: "/ə'kjuːmjəleɪt/",
        partOfSpeech: 'verb',
        meaningVi: 'tích lũy, gom góp lại',
        examples: [{ sentenceEn: 'He accumulated a fortune through wise stock investments.', sentenceVi: 'Ông đã tích lũy được một gia tài thông qua các khoản đầu tư cổ phiếu khôn ngoan.' }],
      },
      {
        id: 'f3',
        word: 'asset',
        ipa: "/'æset/",
        partOfSpeech: 'noun',
        meaningVi: 'tài sản, của cải doanh nghiệp',
        examples: [{ sentenceEn: 'Real estate is considered a valuable long-term asset.', sentenceVi: 'Bất động sản được coi là một tài sản dài hạn có giá trị.' }],
      },
      {
        id: 'f4',
        word: 'audit',
        ipa: "/'ɔːdɪt/",
        partOfSpeech: 'noun/verb',
        meaningVi: 'kiểm toán, kiểm tra sổ sách kế toán',
        examples: [{ sentenceEn: 'An external firm was hired to conduct the annual financial audit.', sentenceVi: 'Một công ty bên ngoài đã được thuê để tiến hành kiểm toán tài chính hàng năm.' }],
      },
      {
        id: 'f5',
        word: 'budget',
        ipa: "/'bʌdʒɪt/",
        partOfSpeech: 'noun/verb',
        meaningVi: 'ngân sách, dự toán chi tiêu',
        examples: [{ sentenceEn: 'The marketing department exceeded its quarterly budget.', sentenceVi: 'Phòng tiếp thị đã vượt quá ngân sách hàng quý của mình.' }],
      },
      {
        id: 'f6',
        word: 'client',
        ipa: "/'klaɪənt/",
        partOfSpeech: 'noun',
        meaningVi: 'khách hàng, thân chủ kinh doanh',
        examples: [{ sentenceEn: 'The firm maintains strong relationships with its international clients.', sentenceVi: 'Công ty duy trì mối quan hệ bền chặt với các khách hàng quốc tế.' }],
      },
      {
        id: 'f7',
        word: 'debt',
        ipa: '/det/',
        partOfSpeech: 'noun',
        meaningVi: 'món nợ, nợ nần',
        examples: [{ sentenceEn: 'The company worked hard to pay off its short-term debts.', sentenceVi: 'Công ty đã làm việc chăm chỉ để trả hết các khoản nợ ngắn hạn.' }],
      },
      {
        id: 'f8',
        word: 'outstanding',
        ipa: "/aʊt'stændɪŋ/",
        partOfSpeech: 'adj',
        meaningVi: 'chưa trả, còn tồn đọng (nợ); nổi bật, xuất sắc',
        examples: [{ sentenceEn: 'Please settle all outstanding invoices by the end of the month.', sentenceVi: 'Vui lòng thanh toán tất cả các hóa đơn còn tồn đọng vào cuối tháng.' }],
      },
      {
        id: 'f9',
        word: 'profit',
        ipa: "/'prɒfɪt/",
        partOfSpeech: 'noun',
        meaningVi: 'lợi nhuận, tiền lãi sinh ra',
        examples: [{ sentenceEn: 'The new product generated significant profit in its first year.', sentenceVi: 'Sản phẩm mới đã tạo ra lợi nhuận đáng kể trong năm đầu tiên.' }],
      },
      {
        id: 'f10',
        word: 'reconcile',
        ipa: "/'rekənsaɪl/",
        partOfSpeech: 'verb',
        meaningVi: 'đối chiếu, làm cho phù hợp (sổ sách kế toán)',
        examples: [{ sentenceEn: 'The accountant must reconcile the bank statements with internal records.', sentenceVi: 'Kế toán viên phải đối chiếu sao kê ngân hàng với các hồ sơ nội bộ.' }],
      },
    ],
  },
]

export default function FlashcardReviewPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const setIdParam = searchParams.get('setId')

  const { data: progressList, isLoading: loadingProgress, review, reviewing } = useFlashcards()

  // State danh sách các bộ từ vựng
  const [courseLists, setCourseLists] = useState([])
  const [loadingLists, setLoadingLists] = useState(true)

  // Bộ từ vựng đang chọn
  const [selectedListId, setSelectedListId] = useState(CURATED_VOCAB_LISTS[0].id)

  // Bộ lọc danh mục & Tìm kiếm bộ từ ở Bước 1
  const [listCategory, setListCategory] = useState('ALL') // 'ALL' | 'COURSE' | 'TOPIC' | 'PERSONAL'
  const [searchListQuery, setSearchListQuery] = useState('')

  // Từ vựng đã chọn trong List đó để học (Set của word id)
  const [selectedWordIds, setSelectedWordIds] = useState(new Set())

  // Bộ lọc từ khóa tìm kiếm trong danh sách từ ở Bước 2
  const [searchWord, setSearchWord] = useState('')

  // Trạng thái màn hình: 'SELECTION' (Chọn list & từ) | 'STUDY' (Luyện thẻ) | 'COMPLETED' (Hoàn thành)
  const [mode, setMode] = useState('SELECTION')

  // Trạng thái mở modal chọn từ vựng của bộ từ đã nhấn
  const [isWordPickerOpen, setIsWordPickerOpen] = useState(false)
  const [loadingModalWords, setLoadingModalWords] = useState(false)

  // Trạng thái lật thẻ ở chế độ STUDY
  const [isFlipped, setIsFlipped] = useState(false)

  // Hàng đợi ôn tập Flashcard trong phiên học hiện tại
  const [studyQueue, setStudyQueue] = useState([])
  const [studyIndex, setStudyIndex] = useState(0)
  const [masteredIds, setMasteredIds] = useState(new Set())
  const [needReviewIds, setNeedReviewIds] = useState(new Set())

  // Từ vựng hiện tại đang hiển thị trong phiên học Flashcard
  const currentStudyWord = studyQueue[studyIndex]

  // Tải danh sách bộ từ vựng tổng hợp từ backend (chỉ 1 request nhanh như question)
  useEffect(() => {
    let isMounted = true

    async function fetchCourseVocabSets() {
      try {
        const sets = await flashcardsApi.getAvailableFlashcardSets().catch(() => [])
        if (isMounted && sets && sets.length > 0) {
          setCourseLists(sets)
        }
      } catch (err) {
        console.error('Không thể tải danh sách bộ từ vựng', err)
      } finally {
        if (isMounted) setLoadingLists(false)
      }
    }

    fetchCourseVocabSets()

    return () => {
      isMounted = false
    }
  }, [])

  // Tổng hợp tất cả các bộ từ vựng sẵn có
  const allVocabLists = useMemo(() => {
    const lists = []

    // 1. Bộ từ cá nhân Spaced Repetition (nếu có từ học viên đã học)
    if (progressList && progressList.length > 0) {
      lists.push({
        id: 'PERSONAL_SPACED_REP',
        title: 'Từ vựng trong lộ trình cá nhân của bạn',
        description: `Gồm ${progressList.length} từ bạn đã gặp trong các bài học cần lặp lại ngắt quãng.`,
        category: 'PERSONAL',
        badge: 'Cá nhân (Due List)',
        words: progressList.map((p) => ({
          id: p.wordId || p.id,
          word: p.word,
          ipa: p.ipa,
          partOfSpeech: p.partOfSpeech,
          meaningVi: p.meaningVi,
          imageUrl: p.imageUrl,
          audioUkUrl: p.audioUkUrl,
          audioUsUrl: p.audioUsUrl,
          examples: p.examples || [],
        })),
      })
    }

    // 2. Các bộ từ vựng thực tế trong các khóa học
    if (courseLists.length > 0) {
      lists.push(...courseLists)
    }

    // 3. Các bộ từ vựng chủ đề TOEIC chuẩn
    lists.push(...CURATED_VOCAB_LISTS)

    return lists
  }, [progressList, courseLists])

  // Tìm bộ từ khớp với tham số ?setId= nếu có
  const targetSet = useMemo(() => {
    if (!setIdParam) return null
    return (
      allVocabLists.find(
        (l) =>
          l.id === setIdParam ||
          l.contentItemId === setIdParam ||
          l.id === `COURSE_SET_${setIdParam}`
      ) || null
    )
  }, [allVocabLists, setIdParam])

  // Tự động tải từ vựng cho targetSet nếu chưa có danh sách từ chi tiết (lazy on-demand)
  useEffect(() => {
    if (!targetSet) return
    if (targetSet.words && targetSet.words.length > 0) {
      if (selectedListId !== targetSet.id) {
        setSelectedListId(targetSet.id)
      }
      return
    }

    if (targetSet.contentItemId) {
      let isMounted = true
      setLoadingModalWords(true)
      contentItemsApi
        .getVocabWords(targetSet.contentItemId)
        .then((words) => {
          if (isMounted && words && words.length > 0) {
            setCourseLists((prev) =>
              prev.map((item) => (item.id === targetSet.id ? { ...item, words } : item))
            )
            setSelectedListId(targetSet.id)
          }
        })
        .catch((err) => console.error('Lỗi tải từ vựng của bộ từ:', err))
        .finally(() => {
          if (isMounted) setLoadingModalWords(false)
        })
      return () => {
        isMounted = false
      }
    }
  }, [targetSet, selectedListId])

  // Kiểm tra bộ từ có thẻ nào ở trạng thái ôn tập không
  const setReviewWords = useMemo(() => {
    if (!targetSet || !targetSet.words) return []
    const progressMap = new Map((progressList || []).map((p) => [p.wordId || p.id, p]))
    return targetSet.words.filter((w) => progressMap.has(w.id))
  }, [targetSet, progressList])

  const isFirstTimeStudy = Boolean(
    targetSet &&
      targetSet.words &&
      targetSet.words.length > 0 &&
      setReviewWords.length === 0
  )

  // Lọc các bộ từ vựng theo Tab danh mục & Ô tìm kiếm ở Bước 1
  const filteredVocabLists = useMemo(() => {
    return allVocabLists.filter((list) => {
      // 1. Lọc theo danh mục
      if (listCategory !== 'ALL' && list.category !== listCategory) {
        return false
      }
      // 2. Lọc theo từ khóa tìm kiếm (tên bộ, khóa học, hoặc chứa từ vựng tương ứng)
      if (searchListQuery.trim()) {
        const q = searchListQuery.toLowerCase().trim()
        const matchTitle = list.title?.toLowerCase().includes(q)
        const matchDesc = list.description?.toLowerCase().includes(q)
        const matchBadge = list.badge?.toLowerCase().includes(q)
        const matchWord =
          list.words?.some(
            (w) => w.word.toLowerCase().includes(q) || (w.meaningVi && w.meaningVi.toLowerCase().includes(q)),
          ) ||
          list.sampleWords?.some((w) => w.toLowerCase().includes(q)) ||
          list.sampleWordDetails?.some(
            (d) => d.word.toLowerCase().includes(q) || (d.meaningVi && d.meaningVi.toLowerCase().includes(q)),
          )
        return matchTitle || matchDesc || matchBadge || matchWord
      }
      return true
    })
  }, [allVocabLists, listCategory, searchListQuery])

  // Lấy danh sách từ của List đang chọn (ưu tiên targetSet nếu có setIdParam)
  const activeList = useMemo(() => {
    if (targetSet) return targetSet
    return allVocabLists.find((l) => l.id === selectedListId) || allVocabLists[0]
  }, [allVocabLists, selectedListId, targetSet])

  // Khi chuyển sang List mới hoặc khi danh sách từ của List được load xong, tự động tích chọn toàn bộ từ
  useEffect(() => {
    if (activeList && activeList.words && activeList.words.length > 0) {
      const allIds = new Set(activeList.words.map((w) => w.id))
      setSelectedWordIds(allIds)
      setSearchWord('')
    }
  }, [activeList, activeList?.words])

  // Lọc từ theo từ khóa tìm kiếm
  const displayedWords = useMemo(() => {
    if (!activeList || !activeList.words) return []
    if (!searchWord.trim()) return activeList.words
    const q = searchWord.toLowerCase().trim()
    return activeList.words.filter(
      (w) => w.word.toLowerCase().includes(q) || w.meaningVi.toLowerCase().includes(q),
    )
  }, [activeList, searchWord])

  // Reset trạng thái lật thẻ khi đổi sang từ mới
  useEffect(() => {
    setIsFlipped(false)
  }, [studyIndex, currentStudyWord])

  // Bật/tắt chọn 1 từ
  const toggleWord = (wordId) => {
    setSelectedWordIds((prev) => {
      const next = new Set(prev)
      if (next.has(wordId)) {
        next.delete(wordId)
      } else {
        next.add(wordId)
      }
      return next
    })
  }

  // Chọn tất cả / Bỏ chọn tất cả trong danh sách đang hiển thị
  const selectAll = () => {
    const next = new Set(selectedWordIds)
    displayedWords.forEach((w) => next.add(w.id))
    setSelectedWordIds(next)
  }

  const deselectAll = () => {
    const next = new Set(selectedWordIds)
    displayedWords.forEach((w) => next.delete(w.id))
    setSelectedWordIds(next)
  }

  // Phát âm thử nhanh trong Modal: Dùng Web Speech API của trình duyệt (100% miễn phí, 0 Cloudinary credit)
  // Chỉ khi bấm "Bắt đầu ôn tập" thì FlashcardCard mới tải âm thanh và hình ảnh Cloudinary
  const previewSpeak = (e, word) => {
    e.stopPropagation()
    speakFallback(word.word)
  }

  const speakFallback = (text) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel()
      const u = new SpeechSynthesisUtterance(text)
      u.lang = 'en-US'
      window.speechSynthesis.speak(u)
    }
  }

  // Bắt đầu phiên học Flashcard từ modal
  const startStudy = () => {
    if (!activeList || !activeList.words) return
    const wordsToStudy = activeList.words.filter((w) => selectedWordIds.has(w.id))
    if (wordsToStudy.length === 0) return

    setStudyQueue(wordsToStudy)
    setStudyIndex(0)
    setIsFlipped(false)
    setMasteredIds(new Set())
    setNeedReviewIds(new Set())
    setIsWordPickerOpen(false)
    setMode('STUDY')
  }

  // Mở modal chọn từ khi người học bấm vào bất kỳ bộ từ nào (Tải từ on-demand chỉ khi bấm vào bộ đó)
  const handleOpenListModal = async (list) => {
    setSelectedListId(list.id)
    setIsWordPickerOpen(true)

    // Nếu bộ từ đã có danh sách từ đầy đủ
    if (list.words && list.words.length > 0) {
      const allIds = new Set(list.words.map((w) => w.id))
      setSelectedWordIds(allIds)
      setSearchWord('')
      return
    }

    // Nếu là bộ từ vựng thuộc khoá học chưa tải chi tiết từ (lazy on-demand loading)
    if (list.contentItemId) {
      setLoadingModalWords(true)
      try {
        const words = await contentItemsApi.getVocabWords(list.contentItemId)
        if (words && words.length > 0) {
          // Lưu cache lại vào state courseLists
          setCourseLists((prev) =>
            prev.map((item) => (item.id === list.id ? { ...item, words } : item))
          )
          const allIds = new Set(words.map((w) => w.id))
          setSelectedWordIds(allIds)
          setSearchWord('')
        }
      } catch (err) {
        console.error('Không thể tải từ vựng của bộ này:', err)
      } finally {
        setLoadingModalWords(false)
      }
    }
  }

  // Đóng modal khi nhấn phím Escape
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isWordPickerOpen) {
        setIsWordPickerOpen(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isWordPickerOpen])

  // Xáo trộn thẻ
  const shuffleQueue = () => {
    setStudyQueue((prev) => {
      const copy = [...prev]
      for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        ;[copy[i], copy[j]] = [copy[j], copy[i]]
      }
      return copy
    })
    setStudyIndex(0)
    setIsFlipped(false)
  }

  // Xử lý khi học viên bấm "Đã biết" hoặc "Chưa biết"
  const handleStudyAction = async (knewIt) => {
    const currentWord = studyQueue[studyIndex]
    if (!currentWord) return

    setIsFlipped(false)

    const isMockCurated =
      typeof currentWord.id === 'string' &&
      currentWord.id.startsWith('c') &&
      currentWord.id.length < 5

    if (knewIt) {
      setMasteredIds((prev) => new Set(prev).add(currentWord.id))
      // Nếu là từ trong lộ trình backend hoặc từ khóa học, lưu tiến độ Spaced Repetition
      if (!isMockCurated) {
        review?.({ wordId: currentWord.id, knewIt: true }).catch(() => {})
      }

      // Sang từ tiếp theo
      if (studyIndex < studyQueue.length - 1) {
        setStudyIndex((i) => i + 1)
      } else {
        setMode('COMPLETED')
      }
    } else {
      // Chưa thuộc: Đánh dấu cần ôn lại và đưa từ này xuống cuối hàng đợi
      setNeedReviewIds((prev) => new Set(prev).add(currentWord.id))
      if (!isMockCurated) {
        review?.({ wordId: currentWord.id, knewIt: false }).catch(() => {})
      }

      // Đưa từ này về cuối hàng đợi để học viên học lại trước khi kết thúc
      setStudyQueue((prev) => [...prev, currentWord])
      setStudyIndex((i) => i + 1)
    }
  }

  // Lắng nghe phím tắt điều khiển Flashcard khi đang học
  useEffect(() => {
    if (mode !== 'STUDY') return

    const handleKeyDown = (e) => {
      // Tránh cướp phím khi đang nhập text
      if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return

      if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault()
        setIsFlipped((f) => !f)
      } else if (e.key === '1' || e.key === 'ArrowLeft') {
        e.preventDefault()
        handleStudyAction(false)
      } else if (e.key === '2' || e.key === 'ArrowRight') {
        e.preventDefault()
        handleStudyAction(true)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [mode, studyIndex, studyQueue])

  return (
    <div className="flashcard-review-page-container">
      {/* ============================================================== */}
      {/* 1. MÀN HÌNH CHỌN LIST VÀ CHỌN TỪ (SELECTION MODE)             */}
      {/* ============================================================== */}
      {mode === 'SELECTION' && (
        <div className="flashcard-selection-view">
          {/* Banner Giới thiệu Ôn tập Flashcards thông minh */}
          <div className="flashcards-header-banner">
            <img
              src={anhOnTapImg}
              alt="Banner Ôn tập Flashcards thông minh"
              className="flashcards-banner-bg-img"
            />
            <div className="flashcards-banner-content">
              <h1 className="flashcards-banner-title">Ôn tập Flashcards thông minh</h1>
              <p className="flashcards-banner-desc">
                Chọn bộ từ vựng theo chủ đề, xem trước các từ vựng nổi bật và bắt đầu luyện phản xạ ghi nhớ với thuật toán lặp lại ngắt quãng (Spaced Repetition).
              </p>
            </div>
          </div>

          {/* BƯỚC 1: CHỌN HOẶC ÔN BỘ TỪ VỰNG */}
          {setIdParam ? (
            /* CHẾ ĐỘ ÔN RIÊNG BỘ TỪ ĐƯỢC CHỈ ĐỊNH */
            <section className="flashcard-section-box">
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: 12,
                  marginBottom: 16,
                }}
              >
                <button
                  type="button"
                  className="btn secondary sm flex-row"
                  style={{ gap: 6 }}
                  onClick={() => setSearchParams({})}
                >
                  <ArrowLeft size={14} />
                  <span>Xem tất cả bộ từ vựng</span>
                </button>

                {targetSet?.contentItemId && (
                  <Link
                    to={`/content-items/${targetSet.contentItemId}?courseId=${targetSet.courseId || ''}&section=VOCAB`}
                    className="btn secondary sm flex-row"
                    style={{ gap: 6 }}
                  >
                    <BookOpen size={14} />
                    <span>Học trong khóa học</span>
                  </Link>
                )}
              </div>

              {targetSet ? (
                <div
                  className="card"
                  style={{
                    padding: 24,
                    borderRadius: 12,
                    background: 'var(--surface, #ffffff)',
                    border: '1px solid var(--border)',
                  }}
                >
                  <div className="flex-between" style={{ flexWrap: 'wrap', gap: 14, marginBottom: 16 }}>
                    <div>
                      <div className="flex-row" style={{ gap: 8, alignItems: 'center', marginBottom: 6 }}>
                        <span className="badge neutral" style={{ fontSize: 11 }}>
                          {targetSet.badge}
                        </span>
                        <span className="text-dim text-xs">
                          {targetSet.words?.length || targetSet.wordCount || 0} từ vựng
                        </span>
                      </div>
                      <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>
                        {targetSet.title}
                      </h2>
                      <p className="text-dim text-sm" style={{ margin: '6px 0 0', maxWidth: 640 }}>
                        {targetSet.description}
                      </p>
                    </div>

                    <div className="flex-row" style={{ gap: 10, flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        className="btn secondary flex-row"
                        style={{ gap: 6 }}
                        onClick={() => handleOpenListModal(targetSet)}
                        disabled={loadingModalWords}
                      >
                        <CheckSquare size={14} />
                        <span>Chọn lọc từ ({selectedWordIds.size})</span>
                      </button>

                      <button
                        type="button"
                        className="btn hero-btn-primary flex-row"
                        style={{ gap: 8, padding: '10px 22px', fontSize: 14.5 }}
                        onClick={() => {
                          if (!targetSet.words || targetSet.words.length === 0) {
                            handleOpenListModal(targetSet)
                          } else {
                            startStudy()
                          }
                        }}
                        disabled={loadingModalWords}
                      >
                        <PlayCircle size={16} />
                        <span>{isFirstTimeStudy ? 'Bắt đầu học lần đầu' : 'Bắt đầu ôn tập'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Trạng thái tiến trình ôn tập vs học lần đầu */}
                  <div
                    style={{
                      padding: '12px 16px',
                      borderRadius: 8,
                      background: isFirstTimeStudy ? 'rgba(99, 102, 241, 0.08)' : 'rgba(16, 185, 129, 0.08)',
                      border: `1px solid ${isFirstTimeStudy ? 'rgba(99, 102, 241, 0.2)' : 'rgba(16, 185, 129, 0.2)'}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: 12,
                      marginBottom: 20,
                    }}
                  >
                    <div className="flex-row" style={{ gap: 8, alignItems: 'center' }}>
                      <Sparkles size={16} color={isFirstTimeStudy ? 'var(--accent, #6366f1)' : '#10b981'} />
                      <span style={{ fontSize: 13, color: 'var(--text)' }}>
                        {isFirstTimeStudy ? (
                          <>
                            Bộ từ này <strong>chưa có thẻ nào trong tiến trình ôn tập</strong>. Bạn có thể bắt đầu học lần đầu toàn bộ {targetSet.words?.length || targetSet.wordCount} từ vựng để kích hoạt chu trình Spaced Repetition.
                          </>
                        ) : (
                          <>
                            Có <strong>{setReviewWords.length}</strong>/{targetSet.words?.length || targetSet.wordCount} từ trong bộ này đang ở trạng thái cần ôn tập.
                          </>
                        )}
                      </span>
                    </div>

                    {targetSet.contentItemId && (
                      <Link
                        to={`/content-items/${targetSet.contentItemId}?courseId=${targetSet.courseId || ''}&section=VOCAB`}
                        className="text-xs"
                        style={{ color: 'var(--accent)', fontWeight: 600, textDecoration: 'none' }}
                      >
                        Học đầy đủ 5 dạng trong bài giảng →
                      </Link>
                    )}
                  </div>

                  {/* Danh sách các từ mẫu của bộ */}
                  {targetSet.words && targetSet.words.length > 0 ? (
                    <div>
                      <h4 style={{ margin: '0 0 10px', fontSize: 14, fontWeight: 600 }}>
                        Danh sách từ vựng trong bộ ({targetSet.words.length}):
                      </h4>
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
                          gap: 10,
                        }}
                      >
                        {targetSet.words.slice(0, 12).map((w) => (
                          <div
                            key={w.id}
                            style={{
                              padding: '8px 12px',
                              borderRadius: 8,
                              background: 'var(--surface-hover, #f8fafc)',
                              border: '1px solid var(--border)',
                              fontSize: 13,
                            }}
                          >
                            <div className="flex-between">
                              <strong style={{ color: 'var(--text)' }}>{w.word}</strong>
                              {w.partOfSpeech && (
                                <span className="vocab-row-pos-tag">{w.partOfSpeech}</span>
                              )}
                            </div>
                            <div
                              className="text-dim text-xs"
                              style={{
                                marginTop: 2,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {w.meaningVi}
                            </div>
                          </div>
                        ))}
                      </div>
                      {targetSet.words.length > 12 && (
                        <div className="text-dim text-xs" style={{ marginTop: 8 }}>
                          +{targetSet.words.length - 12} từ vựng khác...
                        </div>
                      )}
                    </div>
                  ) : loadingModalWords ? (
                    <div style={{ padding: 30, textAlign: 'center' }}>
                      <div className="spinner" style={{ margin: '0 auto 10px' }} />
                      <span className="text-dim text-xs">Đang tải danh sách từ vựng...</span>
                    </div>
                  ) : null}
                </div>
              ) : loadingLists ? (
                <div style={{ padding: 40, textAlign: 'center' }}>
                  <div className="spinner" style={{ margin: '0 auto 12px' }} />
                  <span className="text-dim text-sm">Đang tải thông tin bộ từ vựng...</span>
                </div>
              ) : (
                <div className="empty-state" style={{ padding: 32, textAlign: 'center' }}>
                  <p className="text-dim">Không tìm thấy bộ từ vựng với mã "{setIdParam}".</p>
                  <button
                    type="button"
                    className="btn primary sm"
                    onClick={() => setSearchParams({})}
                  >
                    Xem tất cả bộ từ vựng
                  </button>
                </div>
              )}
            </section>
          ) : (
            <section className="flashcard-section-box">
              <div className="flashcard-section-title-row">
                <div>
                  <h2 className="flashcard-section-title">Chọn bộ từ vựng (List)</h2>
                  <p className="text-dim text-sm" style={{ margin: '2px 0 0 0' }}>
                    Các từ tiêu biểu hiển thị trực tiếp trên mỗi bộ từ giúp bạn nhận diện nhanh nội dung cần ôn tập.
                  </p>
                </div>
              </div>

              {/* Thanh lọc danh mục & Tìm kiếm nhanh Bước 1 */}
              <div className="vocab-list-filter-bar">
                <div className="vocab-list-category-tabs">
                  <button
                    type="button"
                    className={`list-filter-tab ${listCategory === 'ALL' ? 'active' : ''}`}
                    onClick={() => setListCategory('ALL')}
                  >
                    Tất cả ({allVocabLists.length})
                  </button>
                  {courseLists.length > 0 && (
                    <button
                      type="button"
                      className={`list-filter-tab ${listCategory === 'COURSE' ? 'active' : ''}`}
                      onClick={() => setListCategory('COURSE')}
                    >
                      Khóa học ({courseLists.length})
                    </button>
                  )}
                  <button
                    type="button"
                    className={`list-filter-tab ${listCategory === 'TOPIC' ? 'active' : ''}`}
                    onClick={() => setListCategory('TOPIC')}
                  >
                    Chủ đề TOEIC ({CURATED_VOCAB_LISTS.length})
                  </button>
                  {progressList && progressList.length > 0 && (
                    <button
                      type="button"
                      className={`list-filter-tab ${listCategory === 'PERSONAL' ? 'active' : ''}`}
                      onClick={() => setListCategory('PERSONAL')}
                    >
                      Lộ trình cá nhân
                    </button>
                  )}
                </div>

                <div className="vocab-list-search-wrap">
                  <Search size={15} className="search-icon" />
                  <input
                    type="text"
                    className="vocab-list-search-input"
                    placeholder="Tìm bộ từ hoặc từ vựng bất kỳ..."
                    value={searchListQuery}
                    onChange={(e) => setSearchListQuery(e.target.value)}
                  />
                  {searchListQuery && (
                    <button
                      type="button"
                      className="clear-search-btn"
                      onClick={() => setSearchListQuery('')}
                      title="Xóa tìm kiếm"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              </div>

              {/* Grid các bộ từ vựng với Preview tags */}
              <div className="vocab-lists-grid">
                {filteredVocabLists.map((list) => {
                  const isSelected = selectedListId === list.id
                  const totalCount = list.wordCount || list.words?.length || 0
                  const previewWords = list.sampleWords || list.words?.slice(0, 5).map((w) => w.word) || []
                  const remainingCount = Math.max(0, totalCount - previewWords.length)

                  return (
                    <div
                      key={list.id}
                      className={`vocab-list-card ${isSelected ? 'selected' : ''}`}
                      onClick={() => handleOpenListModal(list)}
                      role="button"
                      tabIndex={0}
                    >
                      <div className="vocab-list-card-top">
                        <span className="vocab-list-badge">{list.badge}</span>
                        <span className="vocab-list-count">
                          <BookOpen size={13} />
                          <span>{totalCount} từ</span>
                        </span>
                      </div>

                      <h3 className="vocab-list-title">{list.title}</h3>
                      <p className="vocab-list-desc">{list.description}</p>

                      {/* Word preview chips — Nhìn thấy ngay từ vựng của list mà không cần bấm vào */}
                      <div className="vocab-list-preview-chips">
                        {previewWords.map((wordStr, wIdx) => (
                          <span key={wIdx} className="vocab-preview-pill">
                            {wordStr}
                          </span>
                        ))}
                        {remainingCount > 0 && (
                          <span className="vocab-preview-more">+{remainingCount} từ nữa</span>
                        )}
                      </div>

                      {/* Nghĩa tiêu biểu của từ vựng trong bộ */}
                      {list.sampleWordDetails && list.sampleWordDetails.length > 0 ? (
                        <div className="vocab-list-meanings-preview">
                          <span className="preview-label">Từ vựng: </span>
                          <span className="preview-meanings-text">
                            {list.sampleWordDetails
                              .slice(0, 3)
                              .map((w) => `${w.word} (${(w.meaningVi || '').split(',')[0].split(';')[0]})`)
                              .join(' • ')}
                          </span>
                        </div>
                      ) : list.words && list.words.length > 0 ? (
                        <div className="vocab-list-meanings-preview">
                          <span className="preview-label">Từ vựng: </span>
                          <span className="preview-meanings-text">
                            {list.words
                              .slice(0, 3)
                              .map((w) => `${w.word} (${(w.meaningVi || '').split(',')[0].split(';')[0]})`)
                              .join(' • ')}
                          </span>
                        </div>
                      ) : null}

                      <div className="vocab-list-card-bottom">
                        <span className="vocab-list-select-indicator">
                          <CheckCircle2 size={16} className="text-accent" />
                          <strong>Nhấp để chọn & ôn tập từ</strong>
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>

              {filteredVocabLists.length === 0 && (
                <div className="empty-state" style={{ padding: 32, textAlign: 'center' }}>
                  <p className="text-dim">Không tìm thấy bộ từ vựng nào khớp với từ khóa "{searchListQuery}".</p>
                </div>
              )}
            </section>
          )}

          {/* ============================================================== */}
          {/* MODAL CHỌN CÁC TỪ TRONG BỘ TỪ (WORD PICKER MODAL)              */}
          {/* ============================================================== */}
          {isWordPickerOpen && activeList && (
            <div className="modal-overlay" onClick={() => setIsWordPickerOpen(false)}>
              <div
                className="modal-panel vocab-word-picker-modal"
                onClick={(e) => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
              >
                {/* Header Modal */}
                <div className="modal-header vocab-modal-header">
                  <div className="vocab-modal-header-info">
                    <div className="flex-row" style={{ gap: 8, alignItems: 'center' }}>
                      <span className="vocab-list-badge">{activeList.badge}</span>
                      <span className="vocab-list-count">
                        <BookOpen size={13} />
                        <span>{activeList?.wordCount || activeList.words?.length || 0} từ</span>
                      </span>
                    </div>
                    <h2 className="vocab-modal-title">{activeList.title}</h2>
                    <p className="vocab-modal-desc">{activeList.description}</p>
                  </div>
                  <button
                    type="button"
                    className="modal-close"
                    onClick={() => setIsWordPickerOpen(false)}
                    aria-label="Đóng"
                  >
                    <X size={18} />
                  </button>
                </div>

                {/* Toolbar: Tìm kiếm & Chọn nhanh */}
                <div className="vocab-modal-toolbar">
                  <div className="vocab-words-search-wrap">
                    <Search size={15} className="search-icon" />
                    <input
                      type="text"
                      className="vocab-words-search-input"
                      placeholder="Tìm từ vựng hoặc nghĩa tiếng Việt trong bộ này..."
                      value={searchWord}
                      onChange={(e) => setSearchWord(e.target.value)}
                      autoFocus
                    />
                    {searchWord && (
                      <button
                        type="button"
                        className="clear-search-btn"
                        onClick={() => setSearchWord('')}
                        title="Xóa tìm kiếm"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>

                  <div className="vocab-words-quick-actions">
                    <button type="button" className="btn secondary sm" onClick={selectAll} disabled={loadingModalWords}>
                      <CheckSquare size={14} />
                      <span>Chọn tất cả ({displayedWords.length})</span>
                    </button>
                    <button type="button" className="btn secondary sm" onClick={deselectAll} disabled={loadingModalWords}>
                      <Square size={14} />
                      <span>Bỏ chọn</span>
                    </button>
                  </div>
                </div>

                {/* Body: Danh sách từ vựng có checkbox cuộn mượt mà */}
                <div className="modal-body vocab-modal-body">
                  {loadingModalWords ? (
                    <div
                      className="flex-col"
                      style={{
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '60px 20px',
                        gap: 12,
                      }}
                    >
                      <div className="spinner" />
                      <span className="text-dim text-sm">
                        Đang truy xuất nhanh danh sách từ vựng...
                      </span>
                    </div>
                  ) : displayedWords.length > 0 ? (
                    <div className="vocab-words-items-list">
                      {displayedWords.map((item, idx) => {
                        const isChecked = selectedWordIds.has(item.id)
                        return (
                          <div
                            key={item.id}
                            className={`vocab-word-select-row ${isChecked ? 'checked' : ''}`}
                            onClick={() => toggleWord(item.id)}
                          >
                            {/* Checkbox */}
                            <div className="vocab-checkbox-wrap" onClick={(e) => e.stopPropagation()}>
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => toggleWord(item.id)}
                                id={`word-chk-${item.id}`}
                              />
                            </div>

                            {/* Số thứ tự */}
                            <span className="vocab-row-index">{idx + 1}</span>

                            {/* Thông tin từ */}
                            <div className="vocab-row-main">
                              <div className="vocab-row-word-title">
                                <strong className="vocab-row-word-text">{item.word}</strong>
                                {item.partOfSpeech && (
                                  <span className="vocab-row-pos-tag">{item.partOfSpeech}</span>
                                )}
                                {item.ipa && <span className="vocab-row-ipa">{item.ipa}</span>}

                                <button
                                  type="button"
                                  className="vocab-row-listen-btn"
                                  title="Nghe phát âm"
                                  onClick={(e) => previewSpeak(e, item)}
                                >
                                  <Volume2 size={14} />
                                </button>
                              </div>

                              <div className="vocab-row-meaning">
                                {(() => {
                                  if (!item.meaningVi) return null
                                  const eqIdx = item.meaningVi.indexOf('=')
                                  if (eqIdx !== -1) {
                                    const viPart = item.meaningVi.substring(0, eqIdx).trim()
                                    const enPart = item.meaningVi.substring(eqIdx + 1).trim()
                                    return (
                                      <>
                                        <span className="vocab-meaning-vi">{viPart}</span>
                                        {enPart && <span className="vocab-meaning-en"> = {enPart}</span>}
                                      </>
                                    )
                                  }
                                  return <span>{item.meaningVi}</span>
                                })()}
                              </div>

                              {item.examples && item.examples.length > 0 && (
                                <div className="vocab-row-example">
                                  "{item.examples[0].sentenceEn}"
                                </div>
                              )}
                            </div>

                            {/* Trạng thái */}
                            <div className="vocab-row-status">
                              {isChecked ? (
                                <span className="vocab-status-pill selected">
                                  <Check size={12} strokeWidth={3} />
                                  Sẽ học
                                </span>
                              ) : (
                                <span className="vocab-status-pill skipped">Bỏ qua</span>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <div className="empty-state" style={{ padding: 32, textAlign: 'center' }}>
                      <p className="text-dim">Không tìm thấy từ vựng nào khớp với từ khóa "{searchWord}".</p>
                    </div>
                  )}
                </div>

                {/* Footer Modal: Thống kê & Nút bắt đầu học */}
                <div className="modal-footer vocab-modal-footer">
                  <div className="vocab-selection-footer-info">
                    <span>Đã chọn:</span>
                    <strong className="vocab-footer-count-badge">
                      {selectedWordIds.size} / {activeList?.wordCount || activeList?.words?.length || 0}
                    </strong>
                    <span>từ</span>
                  </div>

                  <div className="flex-row" style={{ gap: 10 }}>
                    <button
                      type="button"
                      className="btn secondary"
                      onClick={() => setIsWordPickerOpen(false)}
                    >
                      Đóng
                    </button>
                    <button
                      type="button"
                      className="btn hero-btn-primary flex-row"
                      style={{ gap: 8, padding: '10px 24px', fontSize: 14.5 }}
                      disabled={selectedWordIds.size === 0}
                      onClick={startStudy}
                    >
                      <span>Bắt đầu ôn tập ({selectedWordIds.size} từ)</span>
                      <ArrowRight size={16} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* 2. MÀN HÌNH LUYỆN THẺ FLASHCARD (STUDY MODE)                   */}
      {/* ============================================================== */}
      {mode === 'STUDY' && currentStudyWord && (
        <div className="flashcard-runner-view">
          {/* Thanh điều hướng trên cùng */}
          <div className="flashcard-runner-top-nav">
            <button
              type="button"
              className="btn secondary sm flex-row"
              style={{ gap: 6 }}
              onClick={() => setMode('SELECTION')}
            >
              <ArrowLeft size={14} />
              <span>Đổi danh sách từ</span>
            </button>

            <div className="flashcard-runner-step-badge">
              Thẻ <strong>{studyIndex + 1}</strong> / {studyQueue.length}
            </div>

            <button
              type="button"
              className="btn secondary sm flex-row"
              style={{ gap: 6 }}
              onClick={shuffleQueue}
              title="Xáo trộn thứ tự các thẻ"
            >
              <Shuffle size={14} />
              <span>Xáo trộn</span>
            </button>
          </div>

          {/* Thanh tiến độ */}
          <div className="flashcard-runner-progress-track">
            <div
              className="flashcard-runner-progress-fill"
              style={{ width: `${Math.round(((studyIndex + 1) / studyQueue.length) * 100)}%` }}
            />
          </div>

          {/* Thẻ Flashcard tương tác */}
          <div className="flashcard-runner-card-wrap">
            <FlashcardCard
              key={`${currentStudyWord.id}-${studyIndex}`}
              word={currentStudyWord.word}
              ipa={currentStudyWord.ipa}
              partOfSpeech={currentStudyWord.partOfSpeech}
              meaningVi={currentStudyWord.meaningVi}
              imageUrl={currentStudyWord.imageUrl}
              audioUkUrl={currentStudyWord.audioUkUrl}
              audioUsUrl={currentStudyWord.audioUsUrl}
              examples={currentStudyWord.examples}
              flipped={isFlipped}
              onFlipChange={setIsFlipped}
            />
          </div>

          {/* Dock điều khiển Đã thuộc / Lật thẻ / Chưa thuộc hiện đại, tách biệt hoàn toàn khỏi thẻ */}
          <div className="flashcard-study-controls-dock">
            <button
              type="button"
              className="study-control-btn study-btn-dont-know"
              onClick={() => handleStudyAction(false)}
              title="Chưa thuộc từ này - bấm [1] hoặc [←]"
            >
              <div className="btn-icon-circle">
                <X size={18} strokeWidth={2.5} />
              </div>
              <div className="btn-text-group">
                <span className="btn-main-label">Chưa thuộc</span>
                <span className="btn-hotkey-badge">Phím 1</span>
              </div>
            </button>

            <button
              type="button"
              className="study-control-btn study-btn-flip"
              onClick={() => setIsFlipped((f) => !f)}
              title="Lật xem nghĩa hoặc từ - bấm [Space]"
            >
              <div className="btn-icon-circle">
                <RotateCcw size={18} />
              </div>
              <div className="btn-text-group">
                <span className="btn-main-label">{isFlipped ? 'Xem từ vựng' : 'Lật xem nghĩa'}</span>
                <span className="btn-hotkey-badge">Space</span>
              </div>
            </button>

            <button
              type="button"
              className="study-control-btn study-btn-know"
              onClick={() => handleStudyAction(true)}
              title="Đã thuộc từ này - bấm [2] hoặc [→]"
            >
              <div className="btn-icon-circle">
                <Check size={18} strokeWidth={2.5} />
              </div>
              <div className="btn-text-group">
                <span className="btn-main-label">Đã thuộc</span>
                <span className="btn-hotkey-badge">Phím 2</span>
              </div>
            </button>
          </div>

          {/* Hướng dẫn phím tắt */}
          <div className="flashcard-study-shortcuts-hint">
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
              <Lightbulb size={13} style={{ flexShrink: 0 }} /> <strong>Phím tắt tiện lợi:</strong> Nhấn <kbd>Space</kbd> để lật thẻ • <kbd>1</kbd> hoặc <kbd>←</kbd> Chưa thuộc • <kbd>2</kbd> hoặc <kbd>→</kbd> Đã thuộc
            </span>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 3. MÀN HÌNH HOÀN THÀNH PHIÊN HỌC (COMPLETED MODE)              */}
      {/* ============================================================== */}
      {mode === 'COMPLETED' && (
        <div className="flashcard-completed-view">
          <div className="card flashcard-completed-card">
            <div className="flashcard-completed-trophy-wrap">
              <Trophy size={48} className="text-accent" />
            </div>

            <h2 className="flashcard-completed-title">Xuất sắc! Bạn đã hoàn thành phiên ôn tập</h2>
            <p className="flashcard-completed-desc">
              Bạn đã ôn luyện xong <strong>{selectedWordIds.size} từ vựng</strong> trong bộ{' '}
              <em>"{activeList?.title}"</em>.
            </p>

            <div className="flashcard-completed-stats-row">
              <div className="completed-stat-tile green">
                <span className="stat-num">{masteredIds.size}</span>
                <span className="stat-label">Đã nhớ ngay</span>
              </div>
              <div className="completed-stat-tile amber">
                <span className="stat-num">{needReviewIds.size}</span>
                <span className="stat-label">Cần luyện thêm</span>
              </div>
              <div className="completed-stat-tile blue">
                <span className="stat-num">{selectedWordIds.size}</span>
                <span className="stat-label">Tổng số từ</span>
              </div>
            </div>

            <div className="flashcard-completed-actions-row">
              <button
                type="button"
                className="btn secondary flex-row"
                style={{ gap: 8 }}
                onClick={() => {
                  setStudyIndex(0)
                  if (setIdParam) {
                    setSearchParams({})
                  }
                  setMode('SELECTION')
                }}
              >
                <BookOpen size={16} />
                <span>Chọn bộ từ khác</span>
              </button>

              <Link
                to="/reports"
                className="btn secondary flex-row"
                style={{ gap: 8 }}
              >
                <span>Xem báo cáo học tập</span>
              </Link>

              <button
                type="button"
                className="btn hero-btn-primary flex-row"
                style={{ gap: 8 }}
                onClick={() => {
                  startStudy()
                }}
              >
                <RotateCcw size={16} />
                <span>Ôn lại các từ này</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
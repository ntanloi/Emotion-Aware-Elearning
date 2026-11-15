package com.elearning.emotion.service;

import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.safety.Safelist;
import org.springframework.stereotype.Service;

@Service
public class HtmlSanitizerService {

    private final Safelist safelist;
    private final Document.OutputSettings outputSettings;

    public HtmlSanitizerService() {
        // Cho phép các thẻ định dạng nội dung phong phú an toàn
        this.safelist = Safelist.relaxed()
                .preserveRelativeLinks(true) // Giữ nguyên các liên kết tương đối (relative URLs)
                .addTags("mark", "hr", "s", "strike", "del", "u", "code", "pre")
                .addAttributes("span", "style", "class")
                .addAttributes("p", "style", "class")
                .addAttributes("div", "style", "class")
                .addAttributes("mark", "style", "class")
                .addAttributes("table", "style", "class")
                .addAttributes("td", "style", "class", "colspan", "rowspan")
                .addAttributes("th", "style", "class", "colspan", "rowspan")
                // Không cho phép javascript: protocols
                .removeProtocols("a", "href", "javascript")
                .removeProtocols("img", "src", "javascript");

        // Tắt prettyPrint để không tự ý chèn newline hay khoảng trắng làm lệch cấu trúc rich text
        this.outputSettings = new Document.OutputSettings();
        this.outputSettings.prettyPrint(false);
    }

    /**
     * Khử mã độc HTML (loại bỏ <script>, on*=, javascript:) trước khi lưu trữ
     */
    public String sanitize(String html) {
        if (html == null || html.isBlank()) {
            return html;
        }
        return Jsoup.clean(html, "", safelist, outputSettings);
    }

    /**
     * Lấy thuần văn bản (plain text) từ chuỗi HTML, loại bỏ toàn bộ thẻ tag
     */
    public String toPlainText(String html) {
        if (html == null || html.isBlank()) {
            return "";
        }
        return Jsoup.parse(html).text().trim();
    }

    /**
     * Lấy thuần văn bản phần thân (loại bỏ tiêu đề h1..h6 và tiêu đề cột th trong bảng)
     * Dùng cho các luật kiểm duyệt độ dài nội dung thực tế (tránh tiêu đề mẫu tự đạt độ dài).
     */
    public String toBodyText(String html) {
        if (html == null || html.isBlank()) {
            return "";
        }
        Document doc = Jsoup.parse(html);
        doc.select("h1,h2,h3,h4,h5,h6,th").remove();
        return doc.text().trim();
    }
}

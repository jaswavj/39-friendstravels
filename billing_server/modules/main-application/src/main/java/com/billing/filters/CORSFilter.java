package com.billing.filters;

import com.billing.config.CorsProperties;
import jakarta.servlet.Filter;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.ServletRequest;
import jakarta.servlet.ServletResponse;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.util.List;

@Slf4j
@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
@RequiredArgsConstructor
public class CORSFilter implements Filter {

    private final CorsProperties corsProperties;

    @Override
    public void doFilter(ServletRequest req, ServletResponse res, FilterChain chain) throws IOException, ServletException {
        HttpServletRequest request = (HttpServletRequest) req;
        HttpServletResponse response = (HttpServletResponse) res;

        String originHeader = request.getHeader("Origin");
        List<String> allowOrigin = corsProperties.getAllowedOrigins();
        boolean isAllowed = originHeader != null && (
                (allowOrigin != null && allowOrigin.contains(originHeader)) || isLocalNetworkOrigin(originHeader)
        );

        if (originHeader != null && !isAllowed) {
            log.warn("CORS request rejected from origin: {} for URI: {}", originHeader, request.getRequestURI());
            response.setStatus(HttpServletResponse.SC_FORBIDDEN);
            return;
        }

        if (originHeader != null && isAllowed) {
            response.setHeader("Access-Control-Allow-Origin", originHeader);
            response.setHeader("Vary", "Origin");
            response.setHeader("Access-Control-Allow-Credentials", "true");
            response.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS, DELETE, PUT");
            response.setHeader("Access-Control-Max-Age", "3600");
            response.setHeader("Access-Control-Allow-Headers", "Content-Type, Accept, X-Requested-With, remember-me, Authorization");
            response.setHeader("Access-Control-Expose-Headers", "Authorization");
        }

        if ("OPTIONS".equalsIgnoreCase(request.getMethod())) {
            response.setStatus(HttpServletResponse.SC_OK);
            return;
        }

        chain.doFilter(req, res);
    }

    private boolean isLocalNetworkOrigin(String origin) {
        if (origin == null) {
            return false;
        }
        if (Boolean.TRUE.equals(corsProperties.getAllowLocalhost()) && isPrivateOrLocalOrigin(origin)) {
            return true;
        }
        String pattern = corsProperties.getLocalNetworkPattern();
        if (pattern != null && !pattern.isEmpty()) {
            return origin.matches(pattern);
        }
        return false;
    }

    /** localhost plus private LAN (192.168/10/172.16-31) so other PCs can use this server's IP. */
    private boolean isPrivateOrLocalOrigin(String origin) {
        return origin.matches(
                "https?://(localhost|127\\.0\\.0\\.1|192\\.168\\.\\d{1,3}\\.\\d{1,3}"
                        + "|10\\.\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}"
                        + "|172\\.(1[6-9]|2\\d|3[0-1])\\.\\d{1,3}\\.\\d{1,3})(:\\d+)?"
        );
    }
}

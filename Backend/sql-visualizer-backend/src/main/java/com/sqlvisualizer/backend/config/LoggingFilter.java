package com.sqlvisualizer.backend.config;

import jakarta.servlet.*;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.util.ContentCachingRequestWrapper;
import org.springframework.web.util.ContentCachingResponseWrapper;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.Enumeration;

@Component
public class LoggingFilter implements Filter {

    private static final Logger log = LoggerFactory.getLogger(LoggingFilter.class);

    @Override
    public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain)
            throws IOException, ServletException {

        HttpServletRequest httpReq = (HttpServletRequest) request;
        HttpServletResponse httpRes = (HttpServletResponse) response;

        ContentCachingRequestWrapper wrappedReq = new ContentCachingRequestWrapper(httpReq, 10000);
        ContentCachingResponseWrapper wrappedRes = new ContentCachingResponseWrapper(httpRes);

        long start = System.currentTimeMillis();

        try {
            chain.doFilter(wrappedReq, wrappedRes);
        } finally {
            long duration = System.currentTimeMillis() - start;
            logRequest(wrappedReq);
            logResponse(wrappedRes, duration);
            wrappedRes.copyBodyToResponse();
        }
    }

    private void logRequest(ContentCachingRequestWrapper req) {
        log.info(">>> {} {} [{}]",
                req.getMethod(),
                req.getRequestURI(),
                req.getQueryString() != null ? req.getQueryString() : "");

        Enumeration<String> headerNames = req.getHeaderNames();
        while (headerNames.hasMoreElements()) {
            String name = headerNames.nextElement();
            log.debug("  Header: {}: {}", name, req.getHeader(name));
        }

        byte[] buf = req.getContentAsByteArray();
        if (buf.length > 0) {
            String body = new String(buf, StandardCharsets.UTF_8);
            log.info("  Body: {}", body.length() > 1000 ? body.substring(0, 1000) + "..." : body);
        }
    }

    private void logResponse(ContentCachingResponseWrapper res, long durationMs) {
        log.info("<<< {} {}ms [status={}]",
                res.getContentType(),
                durationMs,
                res.getStatus());

        byte[] buf = res.getContentAsByteArray();
        if (buf.length > 0) {
            String body = new String(buf, StandardCharsets.UTF_8);
            log.debug("  Response body: {}", body.length() > 2000 ? body.substring(0, 2000) + "..." : body);
        }
    }
}

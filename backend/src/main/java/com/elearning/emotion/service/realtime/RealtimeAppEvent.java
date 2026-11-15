package com.elearning.emotion.service.realtime;

import org.springframework.context.ApplicationEvent;

/**
 * Spring ApplicationEvent nội bộ dùng để lắng nghe sau transaction commit (@TransactionalEventListener).
 */
public class RealtimeAppEvent extends ApplicationEvent {

    private final RealtimeEvent realtimeEvent;

    public RealtimeAppEvent(Object source, RealtimeEvent realtimeEvent) {
        super(source);
        this.realtimeEvent = realtimeEvent;
    }

    public RealtimeEvent getRealtimeEvent() {
        return realtimeEvent;
    }
}

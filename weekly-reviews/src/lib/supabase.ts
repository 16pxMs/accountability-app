import { createClient } from '@supabase/supabase-js'
import { AppData } from '@/lib/types'

const supabaseUrl = 'https://sfqfzvfrrlgchvsoqvwp.supabase.co'
const supabaseKey = 'sb_publishable_liJPJbeCgk9VMkwmio8aAQ_JPyK2svs'

export const supabase = createClient(supabaseUrl, supabaseKey)

export const syncToCloud = async (data: AppData) => {
    try {
        const { error } = await supabase
            .from('user_data')
            .upsert({
                id: 'user_1',
                data,
                updated_at: new Date().toISOString()
            })

        if (error) {
            console.error('Sync failed:', error)
        }
    } catch (error) {
        console.error('Sync error:', error)
    }
}

export const loadFromCloud = async (): Promise<AppData | null> => {
    try {
        const { data, error } = await supabase
            .from('user_data')
            .select('data')
            .eq('id', 'user_1')
            .single()

        if (error) throw error
        return data?.data || null
    } catch (error) {
        console.error('Load failed:', error)
        return null
    }
}
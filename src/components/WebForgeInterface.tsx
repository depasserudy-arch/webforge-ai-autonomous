import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/lib/supabase';

export default function WebForgeInterface() {
    const [projectData, setProjectData] = useState({
        type: 'website',
        specifications: '',
        budget: 500
    });
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            // Envoi de la commande à WebForge AI via Supabase
            const { data, error } = await supabase
                .from('webforge_orders')
                .insert([{
                    client_id: `client_${Date.now()}`,
                    type: projectData.type,
                    specifications: projectData.specifications,
                    budget: projectData.budget,
                    status: 'PENDING',
                    created_at: new Date().toISOString()
                }])
                .select();

            if (error) throw error;

            setResult({
                success: true,
                message: 'Commande envoyée à WebForge AI ! Génération en cours...',
                orderId: data[0].id
            });
        } catch (error) {
            setResult({
                success: false,
                message: `Erreur : ${error.message}`
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-8">
            <div className="max-w-4xl mx-auto">
                <Card className="bg-black/40 backdrop-blur-xl border-purple-500/20">
                    <CardHeader>
                        <CardTitle className="text-4xl font-bold bg-gradient-to-r from-purple-400 to-pink-600 bg-clip-text text-transparent">
                            🔨 WebForge AI
                        </CardTitle>
                        <CardDescription className="text-gray-300">
                            Agent IA pour la création de sites web et programmes sur mesure
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-200 mb-2">
                                    Type de projet
                                </label>
                                <select
                                    value={projectData.type}
                                    onChange={(e) => setProjectData({ ...projectData, type: e.target.value })}
                                    className="w-full bg-slate-800/50 border border-purple-500/30 rounded-lg px-4 py-2 text-white"
                                >
                                    <option value="website">Site Web</option>
                                    <option value="webapp">Application Web</option>
                                    <option value="api">API Backend</option>
                                    <option value="mobile">Application Mobile</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-200 mb-2">
                                    Spécifications du projet
                                </label>
                                <Textarea
                                    value={projectData.specifications}
                                    onChange={(e) => setProjectData({ ...projectData, specifications: e.target.value })}
                                    placeholder="Décrivez votre projet en détail..."
                                    className="w-full bg-slate-800/50 border border-purple-500/30 rounded-lg px-4 py-2 text-white min-h-[150px]"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-200 mb-2">
                                    Budget (€)
                                </label>
                                <Input
                                    type="number"
                                    value={projectData.budget}
                                    onChange={(e) => setProjectData({ ...projectData, budget: parseInt(e.target.value) })}
                                    min="100"
                                    className="w-full bg-slate-800/50 border border-purple-500/30 rounded-lg px-4 py-2 text-white"
                                    required
                                />
                            </div>

                            <Button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold py-3 rounded-lg transition-all"
                            >
                                {loading ? '⚡ Génération en cours...' : '🚀 Lancer la création'}
                            </Button>
                        </form>

                        {result && (
                            <div className={`mt-6 p-4 rounded-lg ${result.success ? 'bg-green-500/20 border border-green-500/50' : 'bg-red-500/20 border border-red-500/50'}`}>
                                <p className="text-white">{result.message}</p>
                                {result.orderId && (
                                    <p className="text-sm text-gray-300 mt-2">ID de commande : {result.orderId}</p>
                                )}
                            </div>
                        )}
                    </CardContent>
                </Card>

                <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card className="bg-black/40 backdrop-blur-xl border-purple-500/20">
                        <CardHeader>
                            <CardTitle className="text-lg text-purple-400">🔒 Sécurisé</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-gray-300">Encryption AES-256 et isolation complète des données</p>
                        </CardContent>
                    </Card>

                    <Card className="bg-black/40 backdrop-blur-xl border-purple-500/20">
                        <CardHeader>
                            <CardTitle className="text-lg text-purple-400">⚡ Rapide</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-gray-300">Génération automatisée en quelques minutes</p>
                        </CardContent>
                    </Card>

                    <Card className="bg-black/40 backdrop-blur-xl border-purple-500/20">
                        <CardHeader>
                            <CardTitle className="text-lg text-purple-400">💳 Simple</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-gray-300">Paiement sécurisé via Stripe</p>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
